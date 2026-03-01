from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user, hash_senha

router = APIRouter(prefix="/admin", tags=["Admin"])


def require_admin(current_user: models.User = Depends(get_current_user)):
    if current_user.tipo != models.UserType.admin:
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores")
    return current_user


class UserAdminUpdate(BaseModel):
    nome:       Optional[str] = None
    email:      Optional[str] = None
    tipo:       Optional[str] = None
    nova_senha: Optional[str] = None


class UserAdminCreate(BaseModel):
    nome:  str
    email: str
    senha: str
    tipo:  str


@router.get("/usuarios/", response_model=List[schemas.UserResponse])
def listar_usuarios(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin)
):
    return db.query(models.User).order_by(models.User.tipo, models.User.nome).all()


@router.post("/usuarios/", response_model=schemas.UserResponse, status_code=201)
def criar_usuario(
    dados: UserAdminCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin)
):
    if db.query(models.User).filter(models.User.email == dados.email).first():
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")
    try:
        tipo_enum = models.UserType(dados.tipo)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Tipo inválido: {dados.tipo}")

    novo = models.User(
        nome=dados.nome,
        email=dados.email,
        senha_hash=hash_senha(dados.senha),
        tipo=tipo_enum
    )
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return novo


@router.patch("/usuarios/{user_id}/", response_model=schemas.UserResponse)
def atualizar_usuario(
    user_id: int,
    dados: UserAdminUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin)
):
    usuario = db.query(models.User).filter(models.User.id == user_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    if dados.nome:
        usuario.nome = dados.nome
    if dados.email:
        existente = db.query(models.User).filter(
            models.User.email == dados.email,
            models.User.id != user_id
        ).first()
        if existente:
            raise HTTPException(status_code=400, detail="E-mail já em uso")
        usuario.email = dados.email
    if dados.tipo:
        try:
            usuario.tipo = models.UserType(dados.tipo)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Tipo inválido: {dados.tipo}")
    if dados.nova_senha:
        usuario.senha_hash = hash_senha(dados.nova_senha)

    db.commit()
    db.refresh(usuario)
    return usuario


@router.delete("/usuarios/{user_id}/")
def excluir_usuario(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(require_admin)
):
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="Você não pode excluir sua própria conta")

    usuario = db.query(models.User).filter(models.User.id == user_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    if usuario.tipo == models.UserType.admin:
        raise HTTPException(status_code=400, detail="Não é possível excluir contas admin")

    # Excluir dados vinculados antes de excluir o usuário
    if usuario.tipo == models.UserType.profissional:
        # Excluir slots de disponibilidade
        db.query(models.AvailabilitySlot).filter(
            models.AvailabilitySlot.profissional_id == user_id
        ).delete()
        # Excluir consultas onde é profissional
        db.query(models.Appointment).filter(
            models.Appointment.profissional_id == user_id
        ).delete()

    if usuario.tipo == models.UserType.responsavel:
        # Excluir consultas vinculadas ao responsável
        db.query(models.Appointment).filter(
            models.Appointment.responsavel_id == user_id
        ).delete()
        # Excluir pacientes vinculados
        pacientes = db.query(models.Patient).filter(
            models.Patient.responsavel_id == user_id
        ).all()
        for p in pacientes:
            db.query(models.Appointment).filter(
                models.Appointment.patient_id == p.id
            ).delete()
            db.delete(p)

    db.delete(usuario)
    db.commit()
    return {"ok": True}


@router.get("/stats/")
def estatisticas(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin)
):
    return {
        "usuarios":             db.query(models.User).count(),
        "profissionais":        db.query(models.User).filter(models.User.tipo == models.UserType.profissional).count(),
        "responsaveis":         db.query(models.User).filter(models.User.tipo == models.UserType.responsavel).count(),
        "pacientes":            db.query(models.Patient).count(),
        "consultas_total":      db.query(models.Appointment).count(),
        "consultas_realizadas": db.query(models.Appointment).filter(models.Appointment.status == models.AppointmentStatus.realizado).count(),
        "consultas_agendadas":  db.query(models.Appointment).filter(models.Appointment.status == models.AppointmentStatus.agendado).count(),
        "consultas_canceladas": db.query(models.Appointment).filter(models.Appointment.status == models.AppointmentStatus.cancelado).count(),
    }