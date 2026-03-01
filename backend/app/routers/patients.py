from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import date

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user, require_responsavel

router = APIRouter(prefix="/patients", tags=["Pacientes"])


class PatientUpdate(BaseModel):
    nome: Optional[str] = None
    data_nascimento: Optional[date] = None
    observacoes: Optional[str] = None


@router.post("/", response_model=schemas.PatientResponse, status_code=201)
def cadastrar_paciente(
    patient_data: schemas.PatientCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_responsavel)
):
    novo_paciente = models.Patient(
        nome=patient_data.nome,
        data_nascimento=patient_data.data_nascimento,
        observacoes=patient_data.observacoes,
        responsavel_id=current_user.id
    )
    db.add(novo_paciente)
    db.commit()
    db.refresh(novo_paciente)
    return novo_paciente


@router.get("/", response_model=List[schemas.PatientResponse])
def listar_meus_pacientes(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.tipo == models.UserType.profissional:
        return db.query(models.Patient).all()
    return db.query(models.Patient).filter(
        models.Patient.responsavel_id == current_user.id
    ).all()


# ⚠️ Rotas com sub-paths ANTES do /{patient_id}/ para evitar conflito
@router.get("/{patient_id}/historico/", response_model=List[schemas.AppointmentResponse])
def historico_paciente(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Retorna o histórico completo de consultas de um paciente."""
    paciente = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente não encontrado")
    if (current_user.tipo == models.UserType.responsavel
            and paciente.responsavel_id != current_user.id):
        raise HTTPException(status_code=403, detail="Acesso negado")

    return db.query(models.Appointment).filter(
        models.Appointment.patient_id == patient_id
    ).order_by(
        models.Appointment.data.desc(),
        models.Appointment.hora_inicio.desc()
    ).all()


@router.get("/{patient_id}/", response_model=schemas.PatientResponse)
def detalhar_paciente(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    paciente = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente não encontrado")
    if (current_user.tipo == models.UserType.responsavel
            and paciente.responsavel_id != current_user.id):
        raise HTTPException(status_code=403, detail="Acesso negado")
    return paciente


@router.patch("/{patient_id}/", response_model=schemas.PatientResponse)
@router.put("/{patient_id}/", response_model=schemas.PatientResponse)
def atualizar_paciente(
    patient_id: int,
    dados: PatientUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_responsavel)
):
    paciente = db.query(models.Patient).filter(
        models.Patient.id == patient_id,
        models.Patient.responsavel_id == current_user.id
    ).first()
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente não encontrado")

    if dados.nome is not None:
        paciente.nome = dados.nome
    if dados.data_nascimento is not None:
        paciente.data_nascimento = dados.data_nascimento
    if dados.observacoes is not None:
        paciente.observacoes = dados.observacoes

    db.commit()
    db.refresh(paciente)
    return paciente


@router.delete("/{patient_id}/", status_code=200)
def excluir_paciente(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_responsavel)
):
    """Responsável exclui um paciente e todas as consultas vinculadas."""
    paciente = db.query(models.Patient).filter(
        models.Patient.id == patient_id,
        models.Patient.responsavel_id == current_user.id
    ).first()
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente não encontrado")

    # Remover consultas vinculadas primeiro
    db.query(models.Appointment).filter(
        models.Appointment.patient_id == patient_id
    ).delete()

    db.delete(paciente)
    db.commit()
    return {"ok": True}