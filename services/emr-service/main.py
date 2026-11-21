import os
from datetime import datetime
import jwt
from fastapi import FastAPI, Depends, HTTPException, Header
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, Integer, String, Text, Float, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker, Session

DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:root@db:3306/florion_emr")
JWT_SECRET = os.getenv("JWT_SECRET", "florion_secret_key")

import pymysql
from urllib.parse import urlparse
_u = urlparse(DATABASE_URL.replace("mysql+pymysql://", "mysql://"))
_conn = pymysql.connect(host=_u.hostname, port=_u.port or 3306, user=_u.username, password=_u.password)
with _conn.cursor() as _cur:
    _cur.execute(f"CREATE DATABASE IF NOT EXISTS `{_u.path.lstrip('/')}`")
_conn.commit()
_conn.close()

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class MedicalRecord(Base):
    __tablename__ = "medical_records"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, index=True, nullable=False)
    doctor_id = Column(Integer, nullable=False)
    doctor_name = Column(String(100), nullable=False)
    temperature = Column(Float, nullable=False)
    subjective = Column(Text, nullable=False)
    objective = Column(Text, nullable=False)
    assessment = Column(Text, nullable=False)
    plan = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)
app = FastAPI(title="Florion EMR Service (US-2001 & US-2002)")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def verify_clinic_staff(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token tidak valid")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token kadaluarsa atau tidak sah")
    if payload.get("role", "") not in ["admin", "dokter", "paramedik", "staff"]:
        raise HTTPException(status_code=403, detail="Akses ditolak: Hanya staf klinik yang dapat mengakses EMR")
    return payload

class SOAPCreate(BaseModel):
    patient_id: int
    temperature: float = Field(..., ge=30.0, le=45.0)
    subjective: str = Field(..., min_length=3)
    objective: str = Field(..., min_length=3)
    assessment: str = Field(..., min_length=3)
    plan: str = Field(..., min_length=3)

@app.post("/medical-records", status_code=201)
def create_soap(data: SOAPCreate, db: Session = Depends(get_db), user: dict = Depends(verify_clinic_staff)):
    record = MedicalRecord(
        patient_id=data.patient_id,
        doctor_id=user.get("sub", 1),
        doctor_name=user.get("name", "Dokter Klinik"),
        temperature=data.temperature,
        subjective=data.subjective,
        objective=data.objective,
        assessment=data.assessment,
        plan=data.plan,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"message": "Rekam medis SOAP berhasil disimpan", "data": record}

@app.put("/medical-records/{record_id}")
def update_soap(record_id: int, data: SOAPCreate, db: Session = Depends(get_db), user: dict = Depends(verify_clinic_staff)):
    record = db.query(MedicalRecord).filter(MedicalRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Rekam medis tidak ditemukan")
    for key, value in data.model_dump().items():
        setattr(record, key, value)
    db.commit()
    db.refresh(record)
    return {"message": "Rekam medis SOAP diperbarui", "data": record}

@app.get("/patients/{patient_id}/medical-records")
def get_patient_timeline(patient_id: int, db: Session = Depends(get_db), user: dict = Depends(verify_clinic_staff)):
    records = db.query(MedicalRecord).filter(MedicalRecord.patient_id == patient_id).order_by(MedicalRecord.created_at.desc()).all()
    return {"patient_id": patient_id, "total": len(records), "timeline": records}
