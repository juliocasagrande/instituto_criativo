from pydantic import BaseModel, EmailStr
from datetime import date, time, datetime
from typing import Optional
from app.models import UserType, DiaSemana, AppointmentStatus


# ─── AUTH ────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    nome: str
    email: EmailStr
    senha: str
    tipo: UserType


class UserResponse(BaseModel):
    id: int
    nome: str
    email: str
    tipo: UserType
    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class LoginRequest(BaseModel):
    email: EmailStr
    senha: str


# ─── PACIENTES ────────────────────────────────────────────────────────────────

class PatientCreate(BaseModel):
    nome: str
    data_nascimento: date
    observacoes: Optional[str] = None


class PatientResponse(BaseModel):
    id: int
    nome: str
    data_nascimento: date
    observacoes: Optional[str]
    responsavel_id: int
    model_config = {"from_attributes": True}


# ─── DISPONIBILIDADE ──────────────────────────────────────────────────────────

class AvailabilitySlotCreate(BaseModel):
    dia_semana: DiaSemana
    hora_inicio: time
    hora_fim: time


class AvailabilitySlotResponse(BaseModel):
    id: int
    dia_semana: DiaSemana
    hora_inicio: time
    hora_fim: time
    profissional_id: int
    model_config = {"from_attributes": True}


# ─── AGENDAMENTOS ─────────────────────────────────────────────────────────────

class AppointmentCreate(BaseModel):
    data: date
    hora_inicio: time
    hora_fim: time
    patient_id: int
    profissional_id: int
    observacoes: Optional[str] = None


class AppointmentUpdate(BaseModel):
    data: Optional[date] = None
    hora_inicio: Optional[time] = None
    hora_fim: Optional[time] = None
    status: Optional[AppointmentStatus] = None
    observacoes: Optional[str] = None


class PatientSimple(BaseModel):
    id: int
    nome: str
    model_config = {"from_attributes": True}


class UserSimple(BaseModel):
    id: int
    nome: str
    model_config = {"from_attributes": True}


class AppointmentResponse(BaseModel):
    id: int
    data: date
    hora_inicio: time
    hora_fim: time
    status: AppointmentStatus
    observacoes: Optional[str]
    criado_em: Optional[datetime] = None  # <-- corrigido: datetime, não str
    patient: PatientSimple
    profissional: UserSimple
    responsavel: UserSimple
    model_config = {"from_attributes": True}