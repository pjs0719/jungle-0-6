from flask import Flask, render_template, request, jsonify
from datetime import datetime
import calendar
from pymongo import MongoClient
import logging

# MongoDB 연결
client = MongoClient('mongodb://jisung719.synology.me:27017')
db = client.dbjungle
diary_collection = db.diary

app = Flask(__name__, static_folder='static')
logging.basicConfig(level=logging.INFO)
highlight_days_cache = {}

def normalize_date(date_str):
    return datetime.strptime(date_str, "%Y-%m-%d").strftime("%Y-%m-%d")

def calculate_highlight_days(year, month):
    num_days = calendar.monthrange(year, month)[1]
    all_dates = diary_collection.find({}, {"date": True})
    existing_days = {
        int(doc["date"].split("-")[2])
        for doc in all_dates
        if int(doc["date"].split("-")[0]) == year and int(doc["date"].split("-")[1]) == month
    }
    return {day: day in existing_days for day in range(1, num_days + 1)}

# 부분 렌더링을 위한 헬퍼 함수 추가
def render_calendar_partial(year, month):
    return render_template(
        "calendar_partial.html",
        year=year,
        month=month,
        calendar=calendar.Calendar(firstweekday=6).monthdayscalendar(year, month),
        highlight_days=highlight_days_cache.get((year, month), {})
    )

@app.route("/calendar-partial")
def calendar_partial():
    year = request.args.get('year', type=int, default=datetime.today().year)
    month = request.args.get('month', type=int, default=datetime.today().month)
    return render_calendar_partial(year, month)

@app.route('/diary', methods=['GET', 'POST', 'DELETE'])
def handle_diary():
    if request.method == 'GET':
        date_key = normalize_date(request.args.get('dateKey'))
        entry = diary_collection.find_one({'date': date_key}, {'_id': False})
        return jsonify(entry or {})

    elif request.method == 'POST':
        data = request.json
        data['date'] = normalize_date(data['date'])
        diary_collection.update_one({'date': data['date']}, {'$set': data}, upsert=True)
        date_obj = datetime.strptime(data['date'], "%Y-%m-%d")
        highlight_days_cache[(date_obj.year, date_obj.month)] = calculate_highlight_days(date_obj.year, date_obj.month)
        return jsonify({"message": "일기 저장 완료!"})

    elif request.method == 'DELETE':
        date_key = normalize_date(request.args.get('dateKey'))
        result = diary_collection.delete_one({'date': date_key})
        if result.deleted_count > 0:
            date_obj = datetime.strptime(date_key, "%Y-%m-%d")
            highlight_days_cache[(date_obj.year, date_obj.month)] = calculate_highlight_days(date_obj.year, date_obj.month)
            return jsonify({"message": "일기 삭제 완료!"})
        return jsonify({"message": "삭제할 일기 없음"}), 404

@app.route("/")
def calendar_view():
    year = request.args.get('year', type=int, default=datetime.today().year)
    month = request.args.get('month', type=int, default=datetime.today().month)
    
    if month < 1: year, month = year-1, 12
    elif month > 12: year, month = year+1, 1
    
    if (year, month) not in highlight_days_cache:
        highlight_days_cache[(year, month)] = calculate_highlight_days(year, month)
    
    return render_template(
        "index.html",
        year=year,
        month=month,
        calendar=calendar.Calendar(firstweekday=6).monthdayscalendar(year, month),
        today=datetime.today().day if (datetime.today().year, datetime.today().month) == (year, month) else None,
        highlight_days=highlight_days_cache.get((year, month), {})
    )

@app.route('/filter-diary', methods=['GET'])
def filter_diary():
    mood = request.args.get('mood')
    sort_order = request.args.get('order', 'desc')  # 정렬 방식 (default: 최신순)
    
    if not mood:
        return jsonify({"error": "감정을 선택하세요"}), 400
    
    # MongoDB에서 해당 감정의 일기 검색 & 날짜 기준 정렬
    sort_direction = -1 if sort_order == 'desc' else 1  # 최신순: -1, 오래된 순: 1
    results = list(diary_collection.find({'mood': mood}, {'_id': False}).sort('date', sort_direction))
    
    return jsonify(results)

if __name__ == '__main__':
    today = datetime.today()
    highlight_days_cache[(today.year, today.month)] = calculate_highlight_days(today.year, today.month)
    app.run(debug=True)
