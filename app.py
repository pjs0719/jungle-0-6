from flask import Flask, render_template, request, jsonify
from datetime import datetime
import calendar
from pymongo import MongoClient

client = MongoClient('localhost', 27017)
db = client.dbjungle
diary_collection = db.diary

app = Flask(__name__)

@app.route("/")
def calendar_view():
    year = request.args.get('year', default=datetime.today().year, type=int)
    month = request.args.get('month', default=datetime.today().month, type=int)

    if month < 1:
        year -= 1
        month = 12
    elif month > 12:
        year += 1
        month = 1

    cal = calendar.Calendar(firstweekday=calendar.SUNDAY)
    month_days = cal.monthdayscalendar(year, month)

    today = datetime.today()
    current_day = today.day if today.year == year and today.month == month else None

    return render_template("index.html", year=year, month=month, calendar=month_days, today=current_day)

# 📌 일기 저장 (감정 포함)
@app.route('/diary', methods=['POST'])
def save_diary():
    data = request.json
    diary_collection.update_one({'date': data['date']}, {'$set': data}, upsert=True)
    return jsonify({"message": "일기 저장 완료!"})

# 📌 일기 불러오기
@app.route('/diary', methods=['GET'])
def get_diary():
    date_key = request.args.get('dateKey')
    diary = diary_collection.find_one({'date': date_key}, {'_id': False})
    return jsonify(diary) if diary else jsonify(None)

# 📌 일기 삭제
@app.route('/diary', methods=['DELETE'])
def delete_diary():
    date_key = request.args.get('dateKey')
    result = diary_collection.delete_one({'date': date_key})
    return jsonify({"message": "일기 삭제 완료!"}) if result.deleted_count > 0 else jsonify({"message": "삭제할 일기가 없습니다."}), 404

if __name__ == '__main__':
    app.run(debug=True)
