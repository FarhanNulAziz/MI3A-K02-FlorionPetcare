import os
from typing import Optional

import jwt
from fastapi import Depends, Header, HTTPException

JWT_SECRET = os.getenv("JWT_SECRET", "florion_secret_key")


def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """Decode JWT Bearer. 401 bila token hilang atau tidak sah."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401, detail="Token autentikasi tidak ditemukan"
        )
    token = authorization.split(" ", 1)[1]
    try:
        # verify_sub dimatikan agar `sub` bertipe angka dari Laravel tetap
        # diterima pada PyJWT versi baru (PyJWT 2.9 mengabaikan opsi ini).
        return jwt.decode(
            token,
            JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_sub": False},
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=401, detail="Token kadaluarsa atau tidak sah"
        )


def require_roles(*roles: str):
    """Batasi endpoint berdasarkan role di dalam JWT. 403 bila tidak diizinkan."""

    def checker(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in roles:
            raise HTTPException(
                status_code=403,
                detail="Akses ditolak: role Anda tidak diizinkan mengakses fitur ini",
            )
        return user

    return checker
