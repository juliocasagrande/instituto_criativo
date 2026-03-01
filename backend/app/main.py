# app/main.py
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.database import engine
from app import models
from app.routers import auth, patients, schedule, appointments, admin

# Cria tabelas (ok para projetos pequenos; em produção grande, usar migrações Alembic)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Instituto Criativo — Sistema de Agendamento",
    description="API para gestão de consultas psicopedagógicas e neuropsicológicas",
    version="3.0.0",
)

# =========================
# CORS
# =========================
FRONTEND_URL = os.getenv("FRONTEND_URL", "").strip()

ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
]

# adiciona o frontend do Railway (produção)
if FRONTEND_URL:
    ORIGINS.append(FRONTEND_URL)

# Debug útil (aparece nos logs do Railway)
print("CORS ORIGINS:", ORIGINS)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],   # garante preflight para qualquer método
    allow_headers=["*"],   # garante preflight para qualquer header (Authorization etc.)
)

# Fallback para OPTIONS: garante que qualquer preflight tenha resposta 200
# (muito útil quando proxy/CDN faz preflight para caminhos específicos)
@app.options("/{full_path:path}")
async def options_handler(full_path: str, request: Request):
    return JSONResponse(
        status_code=200,
        content={"ok": True},
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
    return {"status": "ok", "message": "Instituto Criativo API rodando"}

# =========================
# Error handler
# =========================
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    # Observação: em produção, evite retornar detalhes internos para o cliente
    return JSONResponse(
        status_code=500,
        headers={"Access-Control-Allow-Origin": "*"},
        content={"detail": f"Erro interno: {str(exc)}"},
    )