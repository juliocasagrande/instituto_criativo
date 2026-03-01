from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from dotenv import load_dotenv
import os

from app.database import get_db
from app import models

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "fallback-inseguro-apenas-para-dev")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "525600"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# =========================
# Helpers
# =========================

def _normalize_password_72(password: str) -> str:
    """
    bcrypt aceita no máximo 72 bytes.
    Para evitar exception em runtime, truncamos para 72 bytes em UTF-8.
    """
    if password is None:
        return ""
    b = password.encode("utf-8")
    return b[:72].decode("utf-8", "ignore")


# =========================
# Password functions
# =========================

def hash_senha(senha: str) -> str:
    senha = _normalize_password_72(senha)
    return pwd_context.hash(senha)


def verificar_senha(senha_plain: str, senha_hash: str) -> bool:
    senha_plain = _normalize_password_72(senha_plain)
    return pwd_context.verify(senha_plain, senha_hash)


# =========================
# JWT / Current user
# =========================

def criar_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não autenticado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")  # pode vir como str
        if user_id is None:
            raise credentials_exception
        user_id_int = int(user_id)
    except (JWTError, ValueError, TypeError):
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == user_id_int).first()
    if user is None:
        raise credentials_exception
    return user


def require_profissional(current_user: models.User = Depends(get_current_user)):
    """Dependência que garante que o endpoint só pode ser acessado pela profissional."""
    if current_user.tipo != models.UserType.profissional:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito à profissional",
        )
    return current_user


def require_responsavel(current_user: models.User = Depends(get_current_user)):
    """Dependência que garante que o endpoint só pode ser acessado por responsáveis."""
    if current_user.tipo != models.UserType.responsavel:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a responsáveis",
        )
    return current_user