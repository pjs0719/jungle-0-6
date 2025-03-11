from flask import Flask, render_template
from pymongo import MongoClient
from datetime import datetime, timedelta
import calendar

app = Flask(__name__)


client = MongoClient('mongodb://jisung719.synology.me:27017')
db = client['diary_app']  # 데이터베이스 이름
collection = db['entries']  # 컬렉션 이름


@app.route("/")
def calendar_view():
    today = datetime.today() + timedelta(days=1)
    current_year = today.year
    current_month = today.month

    # 월별 캘린더 데이터 생성
    cal = calendar.Calendar()
    month_days = cal.monthdayscalendar(current_year, current_month)
    calendar_data = [[day if day != 0 else None for day in week] for week in month_days]

    # 템플릿 렌더링
    return render_template(
        "index.html",
        year=current_year,
        month=current_month,
        calendar=calendar_data
    )


if __name__ == '__main__':  
   app.run('0.0.0.0',port=5001,debug=True)