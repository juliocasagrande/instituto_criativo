from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.database import engine
from app import models
from app.routers import auth, patients, schedule, appointments, admin

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Instituto Criativo — Sistema de Agendamento",
    description="API para gestão de consultas psicopedagógicas e neuropsicológicas",
    version="3.0.0",
)

ORIGINS = ["http://localhost:5173", "http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(schedule.router)
app.include_router(appointments.router)
app.include_router(admin.router)


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "Instituto Criativo API rodando"}


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        headers={"Access-Control-Allow-Origin": "*"},
        content={"detail": f"Erro interno: {str(exc)}"},
    )