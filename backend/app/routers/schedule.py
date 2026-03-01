from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models, schemas
from app.auth import require_profissional, get_current_user

router = APIRouter(prefix="/schedule", tags=["Agenda"])


@router.post("/availability/", response_model=schemas.AvailabilitySlotResponse, status_code=201)
def criar_horario_disponivel(
    slot_data: schemas.AvailabilitySlotCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_profissional)
):
    """Profissional configura um bloco de horário disponível recorrente."""
    # Verificar sobreposição de horários no mesmo dia
    conflito = db.query(models.AvailabilitySlot).filter(
        models.AvailabilitySlot.profissional_id == current_user.id,
        models.AvailabilitySlot.dia_semana == slot_data.dia_semana,
        models.AvailabilitySlot.hora_inicio < slot_data.hora_fim,
        models.AvailabilitySlot.hora_fim > slot_data.hora_inicio,
    ).first()

    if conflito:
        raise HTTPException(
            status_code=400,
            detail=f"Conflito de horário: já existe disponibilidade das "
                   f"{conflito.hora_inicio} às {conflito.hora_fim} neste dia"
        )

    novo_slot = models.AvailabilitySlot(
        dia_semana=slot_data.dia_semana,
        hora_inicio=slot_data.hora_inicio,
        hora_fim=slot_data.hora_fim,
        profissional_id=current_user.id
    )
    db.add(novo_slot)
    db.commit()
    db.refresh(novo_slot)
    return novo_slot


@router.get("/availability/", response_model=List[schemas.AvailabilitySlotResponse])
def listar_horarios_disponiveis(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Lista todos os horários disponíveis configurados pela profissional."""
    return db.query(models.AvailabilitySlot).all()


@router.delete("/availability/{slot_id}/", status_code=204)
def remover_horario(
    slot_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_profissional)
):
    """Profissional remove um bloco de disponibilidade."""
    slot = db.query(models.AvailabilitySlot).filter(
        models.AvailabilitySlot.id == slot_id,
        models.AvailabilitySlot.profissional_id == current_user.id
    ).first()

    if not slot:
        raise HTTPException(status_code=404, detail="Horário não encontrado")

    db.delete(slot)
    db.commit()