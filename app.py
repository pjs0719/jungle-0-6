from flask import Flask, render_template, request, jsonify, redirect, url_for
import calendar
from pymongo import MongoClient
import logging
import certifi
import jwt
import datetime
import hashlib

app = Flask(__name__, static_folder='static')

SECRET_KEY = 'SPARTA'

# MongoDB 연결
client = MongoClient('mongodb://jisung719.synology.me:27017')
db = client.jungle
diary_collection = db.diary
user_collection = db.user  # 유저 컬렉션 추가

logging.basicConfig(level=logging.INFO)

highlight_days_cache = {}


def get_user_id():
    """현재 로그인한 유저의 ID를 반환하는 함수"""
    token_receive = request.cookies.get('mytoken')
    if not token_receive:
        print("🔴 토큰 없음")
        return None

    try:
        payload = jwt.decode(token_receive, SECRET_KEY, algorithms=['HS256'])
        print(f"🟢 유저 ID: {payload.get('id')}") 
        return payload.get("id")
    except (jwt.ExpiredSignatureError, jwt.DecodeError):
        return None


def calculate_user_highlight_days(user_id, year, month):
    """유저별로 하이라이트할 날짜를 계산"""
    if not user_id:
        return {}

    start_date = f"{year:04d}-{month:02d}-01"
    end_date = f"{year:04d}-{month:02d}-31"

    diary_entries = diary_collection.find(
        {"user_id": user_id, "date": {"$gte": start_date, "$lte": end_date}},
        {"date": 1, "_id": 0}
    )

    return {int(entry["date"].split("-")[2]): True for entry in diary_entries}


@app.route("/")
def index():
    return redirect(url_for("login"))

@app.route('/register')
def register():
    return render_template('register.html')

@app.route('/api/register', methods=['POST'])
def api_register():
    id_receive = request.form['id_give']
    pw_receive = request.form['pw_give']
    nickname_receive = request.form['nickname_give']
  
    if db.user.find_one({'id': id_receive}):
        return jsonify({'result': 'fail', 'msg' : '이미 사용중인 ID 입니다.'})
    
  # 중요!!!!아무도(개발자라도) 암호를 해석할 수 없도록 만든다!!! 패스워드를 이런식으로 숨겨서 관리함
    pw_hash = hashlib.sha256(pw_receive.encode('utf-8')).hexdigest()

    db.user.insert_one({'id': id_receive, 'pw': pw_hash, 'nick': nickname_receive})

    
    return jsonify({'result': 'success'})

@app.route("/login")
def login():
    msg = request.args.get("msg")
    return render_template("login.html", msg=msg)


@app.route("/logout")
def logout():
    response = redirect(url_for("login"))
    response.delete_cookie("mytoken")
    return response


@app.route("/api/login", methods=["POST"])
def api_login():
    """로그인 API"""
    id_receive = request.form["id_give"]
    pw_receive = request.form["pw_give"]
    pw_hash = hashlib.sha256(pw_receive.encode("utf-8")).hexdigest()

    user = user_collection.find_one({"id": id_receive, "pw": pw_hash})
    if user:
        payload = {"id": id_receive, "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=30)}
        token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")

        response = jsonify({"result": "success", "token": token})
        response.set_cookie("mytoken", token, httponly=True, secure=False)
        return response

    return jsonify({"result": "fail", "msg": "아이디/비밀번호가 일치하지 않습니다."})


@app.route("/home")
def calendar_view():
    """달력 화면"""
    year = request.args.get("year", type=int, default=datetime.datetime.today().year)
    month = request.args.get("month", type=int, default=datetime.datetime.today().month)

    if month < 1:
        year -= 1
        month = 12
    elif month > 12:
        year += 1
        month = 1

    user_id = get_user_id()
    highlight_days_cache[(user_id, year, month)] = calculate_user_highlight_days(user_id, year, month)

    return render_template(
        "home.html",
        year=year,
        month=month,
        calendar=calendar.Calendar(firstweekday=6).monthdayscalendar(year, month),
        today=datetime.datetime.today().day if (datetime.datetime.today().year, datetime.datetime.today().month) == (year, month) else None,
        highlight_days=highlight_days_cache.get((user_id, year, month), {}),
    )


@app.route("/diary", methods=["GET", "POST", "DELETE"])
def handle_diary():
    """일기 관리 API"""
    user_id = get_user_id()
    if not user_id:
        return jsonify({"message": "로그인이 필요합니다."}), 401

    if request.method == "GET":
        date_key = request.args.get("dateKey")
        diary = diary_collection.find_one({"date": date_key, "user_id": user_id}, {"_id": False})
        return jsonify(diary if diary else {})

    elif request.method == "POST":
        data = request.json
        if "date" not in data:
            return jsonify({"message": "date 필드가 필요합니다."}), 400

        data["user_id"] = user_id
        diary_collection.update_one({"date": data["date"], "user_id": user_id}, {"$set": data}, upsert=True)

        return jsonify({"message": "일기 저장 완료!"})

    elif request.method == "DELETE":
        date_key = request.args.get("dateKey")
        result = diary_collection.delete_one({"date": date_key, "user_id": user_id})

        if result.deleted_count > 0:
            return jsonify({"message": "일기 삭제 완료!"})
        return jsonify({"message": "삭제할 일기가 없습니다."}), 404


@app.route("/calendar-partial")
def calendar_partial():
    """부분 렌더링을 위한 달력 API"""
    year = request.args.get("year", type=int, default=datetime.datetime.today().year)
    month = request.args.get("month", type=int, default=datetime.datetime.today().month)

    user_id = get_user_id()
    highlight_days_cache[(user_id, year, month)] = calculate_user_highlight_days(user_id, year, month)

    return render_template(
        "calendar_partial.html",
        year=year,
        month=month,
        calendar=calendar.Calendar(firstweekday=6).monthdayscalendar(year, month),
        highlight_days=highlight_days_cache.get((user_id, year, month), {}),
    )


@app.route("/filter-diary", methods=["GET"])
def filter_diary():
    """감정 필터링 API"""
    user_id = get_user_id()
    if not user_id:
        return jsonify({"message": "로그인이 필요합니다."}), 401

    mood = request.args.get("mood")
    sort_order = request.args.get("order", "desc")

    if not mood:
        return jsonify({"error": "감정을 선택하세요"}), 400

    sort_direction = -1 if sort_order == "desc" else 1
    results = list(diary_collection.find({"user_id": user_id, "mood": mood}, {"_id": False}).sort("date", sort_direction))

    return jsonify(results)


if __name__ == "__main__":
    app.run("0.0.0.0", port=5001, debug=True)
    today = datetime.datetime.today()
    user_id = get_user_id()
    if user_id:
        highlight_days_cache[(user_id, today.year, today.month)] = calculate_user_highlight_days(user_id, today.year, today.month)
