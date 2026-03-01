from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app import models, schemas
from app.auth import hash_senha, verificar_senha, criar_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.post("/register/", response_model=schemas.UserResponse, status_code=201)
def registrar_usuario(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    """Cria um novo usuário (profissional ou responsável)."""
    existente = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existente:
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")

    novo_usuario = models.User(
        nome=user_data.nome,
        email=user_data.email,
        senha_hash=hash_senha(user_data.senha),
        tipo=user_data.tipo
    )
    db.add(novo_usuario)
    db.commit()
    db.refresh(novo_usuario)
    return novo_usuario


@router.post("/login/", response_model=schemas.Token)
def login(login_data: schemas.LoginRequest, db: Session = Depends(get_db)):

    print("LOGIN REQUEST:", login_data.email)

    user = db.query(models.User).filter(
        models.User.email == login_data.email
    ).first()

    print("USER FOUND:", user)

    if not user:
        print("USER NOT FOUND")
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos")

    senha_ok = verificar_senha(login_data.senha, user.senha_hash)

    print("PASSWORD VALID:", senha_ok)

    if not senha_ok:
        print("INVALID PASSWORD")
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos")

    access_token = criar_token({"sub": str(user.id)})

    print("LOGIN SUCCESS:", user.email)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


# ─── PERFIL ───────────────────────────────────────────────────────────────────

class ProfileUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[str] = None
    senha_atual: Optional[str] = None
    nova_senha: Optional[str] = None


@router.get("/me/", response_model=schemas.UserResponse)
def meu_perfil(current_user: models.User = Depends(get_current_user)):
    """Retorna os dados do usuário logado."""
    return current_user


@router.patch("/me/", response_model=schemas.UserResponse)
def atualizar_perfil(
    dados: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Atualiza nome, e-mail e/ou senha do usuário logado."""
    if dados.nome:
        current_user.nome = dados.nome

    if dados.email:
        existente = db.query(models.User).filter(
            models.User.email == dados.email,
            models.User.id != current_user.id
        ).first()
        if existente:
            raise HTTPException(status_code=400, detail="E-mail já está em uso")
        current_user.email = dados.email

    if dados.nova_senha:
        if not dados.senha_atual:
            raise HTTPException(status_code=400, detail="Informe a senha atual para alterá-la")
        if not verificar_senha(dados.senha_atual, current_user.senha_hash):
            raise HTTPException(status_code=400, detail="Senha atual incorreta")
        current_user.senha_hash = hash_senha(dados.nova_senha)

    db.commit()
    db.refresh(current_user)
    return current_user