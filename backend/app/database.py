from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# O Railway às vezes fornece a URL com prefixo "postgres://" (antigo),
# mas o SQLAlchemy exige "postgresql://". Esta linha corrige isso automaticamente.
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


# Dependência do FastAPI: abre uma sessão por request e fecha ao final
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()