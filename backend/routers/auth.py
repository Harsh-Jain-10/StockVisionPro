from fastapi import Depends
from models.database import User

def get_current_user() -> User:
    return User(id="local_user", email="local@stockvision.pro", role="user")

def create_jwt_token(email: str, role: str) -> str:
    return "mock_token"
