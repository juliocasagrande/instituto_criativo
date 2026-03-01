# app/main.py
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.database import engine
from app import models
from app.routers import auth, patients, schedule, appointments, admin

# Cria tabelas (para projetos pequenos; em produção maior use Alembic)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Instituto Criativo — Sistema de Agendamento",
    description="API para gestão de consultas psicopedagógicas e neuropsicológicas",
    version="3.0.0",
)

# =========================
# CORS
# =========================

# Permite qualquer app hospedado no Railway (ex: frontend-production-xxxx.up.railway.app)
# e também localhost para desenvolvimento
CORS_REGEX = r"https://.*\.up\.railway\.app"

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=CORS_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# Rotas
# =========================

app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(schedule.router)
app.include_router(appointments.router)
app.include_router(admin.router)

# =========================
# Healthcheck
# =========================

@app.get("/", tags=["Health"])
def root():
    return {
        "status": "ok",
        "message": "Instituto Criativo API rodando"
    }

# =========================
# Error handler
# =========================

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        headers={"Access-Control-Allow-Origin": "*"},
        content={"detail": f"Erro interno: {str(exc)}"},
    )