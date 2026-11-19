import os
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship

DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:root@db:3306/florion_inpatient")

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

class Hospitalization(Base):
    __tablename__ = "hospitalizations"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, index=True, nullable=False)
    package_type = Column(String(50), nullable=False)
    daily_rate = Column(Float, nullable=False)
    cage_number = Column(String(20), nullable=False)
    status = Column(String(20), default="DIRAWAT")
    admitted_at = Column(DateTime, default=datetime.utcnow)
    discharged_at = Column(DateTime, nullable=True)
    monitorings = relationship("DailyMonitoring", back_populates="hospitalization")

class DailyMonitoring(Base):
    __tablename__ = "daily_monitorings"
    id = Column(Integer, primary_key=True, index=True)
    hospitalization_id = Column(Integer, ForeignKey("hospitalizations.id"), nullable=False)
    appetite = Column(String(50), nullable=False)
    pip_status = Column(String(50), nullable=False)
    pup_status = Column(String(50), nullable=False)
    vomiting = Column(Boolean, default=False)
    diarrhea = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    recorded_at = Column(DateTime, default=datetime.utcnow)
    hospitalization = relationship("Hospitalization", back_populates="monitorings")

Base.metadata.create_all(bind=engine)
app = FastAPI(title="Florion Inpatient & Monitoring Service (US-2004)")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class HospitalizationCreate(BaseModel):
    patient_id: int
    package_tier: str = Field(..., pattern="^(35k|50k)$")
    cage_number: str

class DailyMonitoringCreate(BaseModel):
    appetite: str
    pip_status: str
    pup_status: str
    vomiting: bool = False
    diarrhea: bool = False
    notes: Optional[str] = None

@app.post("/hospitalizations", status_code=201)
def admit_patient(payload: HospitalizationCreate, db: Session = Depends(get_db)):
    occupied = db.query(Hospitalization).filter(Hospitalization.cage_number == payload.cage_number, Hospitalization.status == "DIRAWAT").first()
    if occupied:
        raise HTTPException(status_code=400, detail=f"Kandang {payload.cage_number} sedang terisi pasien lain")

    rate = 35000.0 if payload.package_tier == "35k" else 50000.0
    pkg_name = "Paket Reguler (35rb/hari)" if payload.package_tier == "35k" else "Paket Intensif (50rb/hari)"

    hosp = Hospitalization(patient_id=payload.patient_id, package_type=pkg_name, daily_rate=rate, cage_number=payload.cage_number)
    db.add(hosp)
    db.commit()
    db.refresh(hosp)
    return {"message": "Pasien berhasil didaftarkan rawat inap", "data": hosp}

@app.get("/hospitalizations/active")
def get_active_inpatients(db: Session = Depends(get_db)):
    return db.query(Hospitalization).filter(Hospitalization.status == "DIRAWAT").all()

@app.post("/hospitalizations/{hosp_id}/monitorings", status_code=201)
def add_daily_monitoring(hosp_id: int, payload: DailyMonitoringCreate, db: Session = Depends(get_db)):
    hosp = db.query(Hospitalization).filter(Hospitalization.id == hosp_id, Hospitalization.status == "DIRAWAT").first()
    if not hosp:
        raise HTTPException(status_code=404, detail="Data rawat inap aktif tidak ditemukan")
    mon = DailyMonitoring(hospitalization_id=hosp_id, **payload.model_dump())
    db.add(mon)
    db.commit()
    db.refresh(mon)
    return {"message": "Daily monitoring berhasil dicatat", "data": mon}

@app.get("/hospitalizations/{hosp_id}/monitorings")
def list_monitorings(hosp_id: int, db: Session = Depends(get_db)):
    return db.query(DailyMonitoring).filter(DailyMonitoring.hospitalization_id == hosp_id).order_by(DailyMonitoring.recorded_at.desc()).all()
