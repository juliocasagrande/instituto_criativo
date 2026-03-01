from sqlalchemy import Column, Integer, String, Date, ForeignKey, Time, Enum, DateTime
from sqlalchemy.orm import relationship
import enum
from datetime import datetime

from app.database import Base


class UserType(str, enum.Enum):
    profissional = "profissional"
    responsavel  = "responsavel"
    admin        = "admin"


class User(Base):
    __tablename__ = "users"

    id         = Column(Integer, primary_key=True, index=True)
    nome       = Column(String(150), nullable=False)
    email      = Column(String(150), unique=True, index=True, nullable=False)
    senha_hash = Column(String(255), nullable=False)
    tipo       = Column(Enum(UserType, native_enum=False), nullable=False)

    patients = relationship("Patient", back_populates="responsavel",
                            foreign_keys="Patient.responsavel_id")


class Patient(Base):
    __tablename__ = "patients"

    id               = Column(Integer, primary_key=True, index=True)
    nome             = Column(String(150), nullable=False)
    data_nascimento  = Column(Date, nullable=False)
    observacoes      = Column(String(500), nullable=True)

    responsavel_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    responsavel    = relationship("User", back_populates="patients",
                                  foreign_keys=[responsavel_id])

    appointments = relationship("Appointment", back_populates="patient")


class DiaSemana(str, enum.Enum):
    segunda = "segunda"
    terca   = "terca"
    quarta  = "quarta"
    quinta  = "quinta"
    sexta   = "sexta"
    sabado  = "sabado"


class AvailabilitySlot(Base):
    __tablename__ = "availability_slots"

    id           = Column(Integer, primary_key=True, index=True)
    dia_semana   = Column(Enum(DiaSemana, native_enum=False), nullable=False)
    hora_inicio  = Column(Time, nullable=False)
    hora_fim     = Column(Time, nullable=False)

    profissional_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    profissional    = relationship("User")


class AppointmentStatus(str, enum.Enum):
    agendado  = "agendado"
    cancelado = "cancelado"
    realizado = "realizado"


class Appointment(Base):
    __tablename__ = "appointments"

    id          = Column(Integer, primary_key=True, index=True)
    data        = Column(Date, nullable=False)
    hora_inicio = Column(Time, nullable=False)
    hora_fim    = Column(Time, nullable=False)
    status      = Column(Enum(AppointmentStatus, native_enum=False),
                         nullable=False, default=AppointmentStatus.agendado)
    observacoes = Column(String(500), nullable=True)
    criado_em   = Column(DateTime, default=datetime.utcnow)

    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    patient    = relationship("Patient", back_populates="appointments")

    profissional_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    profissional    = relationship("User", foreign_keys=[profissional_id])

    responsavel_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    responsavel    = relationship("User", foreign_keys=[responsavel_id])