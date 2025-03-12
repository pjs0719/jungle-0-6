# reset_db.py
from pymongo import MongoClient

client = MongoClient('mongodb://jisung719.synology.me:27017')
db = client.dbjungle

# 컬렉션 전체 삭제
db.diary.drop()

# 캐시도 초기화하려면 (선택사항)
db.highlight_days_cache.drop()

print("Database 초기화 완료!")
