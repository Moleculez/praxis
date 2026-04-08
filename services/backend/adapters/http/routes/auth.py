"""Authentication routes — login only, no registration."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import time

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from services.backend.config import get_settings

router = APIRouter()
logger = logging.getLogger(__name__)


def _get_secret() -> str:
    return get_settings().jwt_secret


class LoginRequest(BaseModel):
    username: str
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def _create_token(user_id: str, username: str) -> str:
    header = (
        base64.urlsafe_b64encode(
            json.dumps({"alg": "HS256", "typ": "JWT"}).encode(),
        )
        .decode()
        .rstrip("=")
    )
    payload = (
        base64.urlsafe_b64encode(
            json.dumps(
                {
                    "sub": user_id,
                    "username": username,
                    "exp": int(time.time()) + 86400,
                },
            ).encode(),
        )
        .decode()
        .rstrip("=")
    )
    sig = hmac.new(
        _get_secret().encode(),
        f"{header}.{payload}".encode(),
        hashlib.sha256,
    ).hexdigest()[:32]
    return f"{header}.{payload}.{sig}"


def _verify_token(token: str) -> dict | None:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        payload = json.loads(base64.urlsafe_b64decode(parts[1] + "=="))
        if payload.get("exp", 0) < time.time():
            return None
        expected_sig = hmac.new(
            _get_secret().encode(),
            f"{parts[0]}.{parts[1]}".encode(),
            hashlib.sha256,
        ).hexdigest()[:32]
        if not hmac.compare_digest(parts[2], expected_sig):
            return None
        return payload  # type: ignore[no-any-return]
    except Exception:
        return None


def _get_current_user(request: Request) -> dict:
    """Extract and validate the current user from the Authorization header."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = _verify_token(auth[7:])
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload


_users: dict[str, dict] = {
    "admin": {
        "id": "1",
        "username": "admin",
        "password_hash": _hash_password("admin"),
    },
}


@router.post("/login")
async def login(body: LoginRequest) -> dict:
    user = _users.get(body.username)
    if not user or user["password_hash"] != _hash_password(body.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = _create_token(user["id"], user["username"])
    return {"token": token, "username": user["username"]}


@router.get("/me")
async def get_me(request: Request) -> dict:
    payload = _get_current_user(request)
    return {"id": payload["sub"], "username": payload["username"]}


@router.post("/change-password")
async def change_password(request: Request, body: ChangePasswordRequest) -> dict:
    payload = _get_current_user(request)
    user = _users.get(payload["username"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user["password_hash"] != _hash_password(body.current_password):
        raise HTTPException(status_code=400, detail="Current password incorrect")
    user["password_hash"] = _hash_password(body.new_password)
    return {"status": "ok"}
