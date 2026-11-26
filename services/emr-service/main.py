import os
from datetime import datetime
from typing import Optional

import jwt
from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import Column, DateTime, Float, Integer, String, Text, create_engine, text
from sqlalchemy.orm import Session, declarative_base, sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://root:root@db:3306/florion_petcare",
)
JWT_SECRET = os.getenv("JWT_SECRET", "florion_secret_key")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class MedicalRecord(Base):
    __tablename__ = "medical_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(Integer, nullable=False, index=True)
    doctor_id = Column(Integer, nullable=False)
    doctor_name = Column(String(255), nullable=True)
    temperature = Column(Float, nullable=True)
    subjective = Column(Text, nullable=False)
    objective = Column(Text, nullable=False)
    assessment = Column(Text, nullable=False)
    plan = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


Base.metadata.create_all(bind=engine)


def ensure_columns():
    with engine.begin() as conn:
        for ddl in [
            "ALTER TABLE medical_records ADD COLUMN doctor_name VARCHAR(255) NULL",
            "ALTER TABLE medical_records ADD COLUMN temperature FLOAT NULL",
        ]:
            try:
                conn.execute(text(ddl))
            except Exception:
                pass


ensure_columns()

app = FastAPI(title="Florion Petcare - EMR Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token tidak ditemukan",
        )
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            options={"verify_aud": False, "verify_iss": False},
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token tidak valid atau kedaluwarsa",
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token tidak valid atau kedaluwarsa",
        )


def require_clinical_staff(user: dict = Depends(get_current_user)):
    role = str(user.get("role", "")).lower()
    if role not in {"admin", "dokter", "paramedik"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akses ditolak: hanya dokter, paramedik, atau admin.",
        )
    return user


class SOAPCreateRequest(BaseModel):
    patient_id: int
    temperature: Optional[float] = Field(default=None, ge=30.0, le=45.0)
    subjective: str = Field(..., min_length=1)
    objective: str = Field(..., min_length=1)
    assessment: str = Field(..., min_length=1)
    plan: str = Field(..., min_length=1)


def serialize_record(rec: MedicalRecord) -> dict:
    return {
        "id": rec.id,
        "patient_id": rec.patient_id,
        "doctor_id": rec.doctor_id,
        "doctor_name": rec.doctor_name or "Dokter Klinik",
        "temperature": rec.temperature,
        "subjective": rec.subjective,
        "objective": rec.objective,
        "assessment": rec.assessment,
        "plan": rec.plan,
        "created_at": rec.created_at.isoformat() if rec.created_at else None,
        "updated_at": rec.updated_at.isoformat() if rec.updated_at else None,
    }


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "emr-service"}


@app.post("/medical-records", status_code=status.HTTP_201_CREATED)
def create_medical_record(
    payload: SOAPCreateRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(require_clinical_staff),
):
    doctor_id = int(user.get("sub") or user.get("id") or 0)
    doctor_name = user.get("name") or "Dokter Klinik"

    record = MedicalRecord(
        patient_id=payload.patient_id,
        doctor_id=doctor_id,
        doctor_name=doctor_name,
        temperature=payload.temperature,
        subjective=payload.subjective.strip(),
        objective=payload.objective.strip(),
        assessment=payload.assessment.strip(),
        plan=payload.plan.strip(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "success": True,
        "message": "Catatan SOAP berhasil disimpan",
        "data": serialize_record(record),
    }


@app.get("/patients/{patient_id}/medical-records")
def get_patient_medical_records(
    patient_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(require_clinical_staff),
):
    records = (
        db.query(MedicalRecord)
        .filter(MedicalRecord.patient_id == patient_id)
        .order_by(MedicalRecord.created_at.desc(), MedicalRecord.id.desc())
        .all()
    )
    timeline = [serialize_record(r) for r in records]
    return {
        "success": True,
        "patient_id": patient_id,
        "total": len(timeline),
        "timeline": timeline,
    }


@app.get("/medical-records/{record_id}")
def get_medical_record_detail(
    record_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(require_clinical_staff),
):
    record = db.query(MedicalRecord).filter(MedicalRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Rekam medis tidak ditemukan")
    return {"success": True, "data": serialize_record(record)}
