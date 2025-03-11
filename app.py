from flask import Flask, render_template, request, redirect, url_for, jsonify
from datetime import datetime
import calendar

from pymongo import MongoClient           # pymongo를 임포트 하기(패키지 인스톨 먼저 해야겠죠?)
client = MongoClient('localhost', 27017)  # mongoDB는 27017 포트로 돌아갑니다.
db = client.dbjungle                      # 'dbjungle'라는 이름의 db를 만듭니다.
diary_collection = db.diary  # 'diary' 컬렉션 사용

app = Flask(__name__)

@app.route("/")
def calendar_view():
    # URL 쿼리 매개변수를 통해 year와 month를 가져옴 (기본값은 현재 날짜)
    year = request.args.get('year', default=datetime.today().year, type=int)
    month = request.args.get('month', default=datetime.today().month, type=int)

    # 월 범위 조정 (1월 이전 또는 12월 이후 처리)
    if month < 1:
        year -= 1
        month = 12
    elif month > 12:
        year += 1
        month = 1

    # 캘린더 데이터 생성
    cal = calendar.Calendar(firstweekday=calendar.SUNDAY)
    month_days = cal.monthdayscalendar(year, month)

    # 오늘 날짜 계산
    today = datetime.today()
    current_day = today.day if today.year == year and today.month == month else None

    return render_template(
        "index.html",
        year=year,
        month=month,
        calendar=month_days,
        today=current_day
    )

@app.route("/select_date")
def select_date():
    # 선택된 날짜 가져오기
    year = request.args.get('year', type=int)
    month = request.args.get('month', type=int)
    day = request.args.get('day', type=int)

    # 선택된 날짜 처리 (예시로 출력)
    selected_date = datetime(year, month, day)
    
    # 여기서 원하는 작업을 수행할 수 있습니다.
    print(f"선택된 날짜는 {selected_date}입니다.")

    return f"선택된 날짜는 {selected_date.strftime('%Y-%m-%d')}입니다."

@app.route('/getDiary', methods=['GET'])
def get_diary():
    date_key = request.args.get('dateKey')
    diary = diary_collection.find_one({'dateKey': date_key})
    if diary:
        return jsonify({
            'title': diary['title'],
            'content': diary['detail'],
            'mood': diary['emotion']
        })
    return jsonify(None)

@app.route('/saveDiary', methods=['POST'])
def save_diary():
    data = request.json
    date_key = data['dateKey']
    diary_collection.update_one(
        {'dateKey': date_key},
        {'$set': {'title': data['title'], 'detail': data['content'], 'emotion': data['emotion'], 'editMode': data['editMode']}},
        upsert=True
    )
    return jsonify({'message': '일기가 저장되었습니다!'})

@app.route('/deleteDiary', methods=['DELETE'])
def delete_diary():
    date_key = request.args.get('dateKey')
    diary_collection.delete_one({'dateKey': date_key})
    return jsonify({'message': '일기가 삭제되었습니다!'})

if __name__ == '__main__':
    app.run(debug=True)
