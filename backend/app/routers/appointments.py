from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date, timedelta

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user, require_responsavel

router = APIRouter(prefix="/appointments/", tags=["Agendamentos"])


@router.post("/", response_model=schemas.AppointmentResponse, status_code=201)
def criar_agendamento(
    data: schemas.AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_responsavel)
):
    """Responsável agenda uma consulta para um de seus pacientes."""

    # Verifica se o paciente pertence ao responsável
    paciente = db.query(models.Patient).filter(
        models.Patient.id == data.patient_id,
        models.Patient.responsavel_id == current_user.id
    ).first()
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente não encontrado")

    # Verifica conflito: já existe agendamento neste horário?
    conflito = db.query(models.Appointment).filter(
        models.Appointment.profissional_id == data.profissional_id,
        models.Appointment.data == data.data,
        models.Appointment.status == models.AppointmentStatus.agendado,
        models.Appointment.hora_inicio < data.hora_fim,
        models.Appointment.hora_fim > data.hora_inicio,
    ).first()
    if conflito:
        raise HTTPException(status_code=400, detail="Horário já está ocupado")

    agendamento = models.Appointment(
        data=data.data,
        hora_inicio=data.hora_inicio,
        hora_fim=data.hora_fim,
        patient_id=data.patient_id,
        profissional_id=data.profissional_id,
        responsavel_id=current_user.id,
        observacoes=data.observacoes,
        status=models.AppointmentStatus.agendado,
    )
    db.add(agendamento)
    db.commit()
    db.refresh(agendamento)
    return agendamento


@router.get("/", response_model=List[schemas.AppointmentResponse])
def listar_agendamentos(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Profissional: vê todos os agendamentos.
    Responsável: vê apenas os seus.
    """
    query = db.query(models.Appointment)
    if current_user.tipo == models.UserType.responsavel:
        query = query.filter(models.Appointment.responsavel_id == current_user.id)
    return query.order_by(models.Appointment.data, models.Appointment.hora_inicio).all()


@router.get("/proximos/", response_model=List[schemas.AppointmentResponse])
def proximas_consultas(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Retorna consultas agendadas nas próximas 24h — usado para lembrete no login."""
    hoje = date.today()
    amanha = hoje + timedelta(days=1)

    query = db.query(models.Appointment).filter(
        models.Appointment.status == models.AppointmentStatus.agendado,
        models.Appointment.data >= hoje,
        models.Appointment.data <= amanha,
    )
    if current_user.tipo == models.UserType.responsavel:
        query = query.filter(models.Appointment.responsavel_id == current_user.id)

    return query.order_by(models.Appointment.data, models.Appointment.hora_inicio).all()


@router.patch("/{appointment_id}/cancelar/", response_model=schemas.AppointmentResponse)
def cancelar_agendamento(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Cancela um agendamento."""
    agendamento = db.query(models.Appointment).filter(
        models.Appointment.id == appointment_id
    ).first()

    if not agendamento:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")

    # Responsável só pode cancelar os seus
    if (current_user.tipo == models.UserType.responsavel
            and agendamento.responsavel_id != current_user.id):
        raise HTTPException(status_code=403, detail="Acesso negado")

    if agendamento.status != models.AppointmentStatus.agendado:
        raise HTTPException(status_code=400, detail="Só é possível cancelar agendamentos ativos")

    agendamento.status = models.AppointmentStatus.cancelado
    db.commit()
    db.refresh(agendamento)
    return agendamento


@router.patch("/{appointment_id}/reagendar/", response_model=schemas.AppointmentResponse)
def reagendar(
    appointment_id: int,
    novos_dados: schemas.AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_responsavel)
):
    """Responsável reagenda uma consulta para nova data/hora."""
    agendamento = db.query(models.Appointment).filter(
        models.Appointment.id == appointment_id,
        models.Appointment.responsavel_id == current_user.id
    ).first()

    if not agendamento:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")

    if agendamento.status != models.AppointmentStatus.agendado:
        raise HTTPException(status_code=400, detail="Só é possível reagendar consultas ativas")

    nova_data = novos_dados.data or agendamento.data
    nova_inicio = novos_dados.hora_inicio or agendamento.hora_inicio
    nova_fim = novos_dados.hora_fim or agendamento.hora_fim

    # Verifica conflito no novo horário (ignora o próprio agendamento)
    conflito = db.query(models.Appointment).filter(
        models.Appointment.profissional_id == agendamento.profissional_id,
        models.Appointment.data == nova_data,
        models.Appointment.status == models.AppointmentStatus.agendado,
        models.Appointment.id != appointment_id,
        models.Appointment.hora_inicio < nova_fim,
        models.Appointment.hora_fim > nova_inicio,
    ).first()
    if conflito:
        raise HTTPException(status_code=400, detail="Novo horário já está ocupado")

    agendamento.data = nova_data
    agendamento.hora_inicio = nova_inicio
    agendamento.hora_fim = nova_fim
    if novos_dados.observacoes is not None:
        agendamento.observacoes = novos_dados.observacoes

    db.commit()
    db.refresh(agendamento)
    return agendamento

@router.patch("/{appointment_id}/realizar/", response_model=schemas.AppointmentResponse)
def marcar_realizado(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Profissional marca uma consulta como realizada."""
    if current_user.tipo != models.UserType.profissional:
        raise HTTPException(status_code=403, detail="Apenas a profissional pode marcar como realizada")

    agendamento = db.query(models.Appointment).filter(
        models.Appointment.id == appointment_id
    ).first()

    if not agendamento:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")

    if agendamento.status != models.AppointmentStatus.agendado:
        raise HTTPException(status_code=400, detail="Apenas consultas agendadas podem ser marcadas como realizadas")

    agendamento.status = models.AppointmentStatus.realizado
    db.commit()
    db.refresh(agendamento)
    return agendamento


@router.patch("/{appointment_id}/observacoes/", response_model=schemas.AppointmentResponse)
def atualizar_observacoes(
    appointment_id: int,
    dados: schemas.AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Profissional adiciona ou edita observações pós-atendimento."""
    if current_user.tipo != models.UserType.profissional:
        raise HTTPException(status_code=403, detail="Apenas a profissional pode editar observações")

    agendamento = db.query(models.Appointment).filter(
        models.Appointment.id == appointment_id
    ).first()
    if not agendamento:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")

    agendamento.observacoes = dados.observacoes
    db.commit()
    db.refresh(agendamento)
    return agendamento