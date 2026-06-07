import os
from pymongo import MongoClient
import pymongo.errors
from datetime import datetime, timezone

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = "stockvision_db"
COLLECTION_NAME = "users"

_client = None

def get_mongo_collection():
    global _client
    if _client is None:
        try:
            # Set a 2 second timeout for connection testing so it doesn't hang
            _client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=2000)
            _client.server_info() # Trigger connection check
        except pymongo.errors.ServerSelectionTimeoutError:
            print("[MongoDB Warning] Local MongoDB server is not running or reachable. Sync skipped.")
            _client = None
            return None
        except Exception as e:
            print(f"[MongoDB Error] Connection failed: {e}")
            _client = None
            return None
    return _client[DB_NAME][COLLECTION_NAME]

def sync_user_to_mongodb(user_id: str, email: str, hashed_password: str | None, role: str = "user") -> bool:
    collection = get_mongo_collection()
    if collection is None:
        return False
    try:
        now_str = datetime.now(timezone.utc).isoformat()
        collection.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "user_id": user_id,
                    "email": email,
                    "hashed_password": hashed_password,
                    "role": role,
                    "updated_at": now_str
                }
            },
            upsert=True
        )
        print(f"[MongoDB Success] Synced user {email} to MongoDB.")
        return True
    except Exception as e:
        print(f"[MongoDB Sync Error] Failed to sync user {email} to MongoDB: {e}")
        return False
