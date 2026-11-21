import os
from datetime import datetime, date
from typing import Optional
import httpx
import pymysql
from urllib.parse import urlparse
from fastapi import FastAPI, Depends, HTTPException, Header, Query
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship

DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:root@db:3306/florion_inpatient")
CORE_API_URL = os.getenv("CORE_API_URL", "http://host.docker.internal:8000/api")

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
    package_price_per_day = Column(Integer, nullable=False)
    cage_number = Column(String(50), nullable=False)
    admission_date = Column(String(20), nullable=False)
    discharge_date = Column(String(20), nullable=True)
    status = Column(String(20), default="inpatient")
    created_at = Column(DateTime, default=datetime.utcnow)
    daily_monitorings = relationship("DailyMonitoring", back_populates="hospitalization", order_by="DailyMonitoring.id.desc()")

class DailyMonitoring(Base):
    __tablename__ = "daily_monitorings"
    id = Column(Integer, primary_key=True, index=True)
    hospitalization_id = Column(Integer, ForeignKey("hospitalizations.id"), nullable=False)
    monitoring_date = Column(String(20), nullable=False)
    appetite = Column(String(100), nullable=True)
    pip = Column(String(100), nullable=True)
    pup = Column(String(100), nullable=True)
    vomiting = Column(Boolean, default=False)
    diarrhea = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    hospitalization = relationship("Hospitalization", back_populates="daily_monitorings")

Base.metadata.create_all(bind=engine)
app = FastAPI(title="Florion Inpatient & Monitoring Service (US-2004)")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def fetch_patient_info(patient_id: int, authorization: Optional[str] = None):
    headers = {"Accept": "application/json"}
    if authorization:
        headers["Authorization"] = authorization
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            res = await client.get(f"{CORE_API_URL}/patients/{patient_id}", headers=headers)
            if res.status_code == 200:
                body = res.json()
                return body.get("data", body)
    except Exception:
        pass
    return {"id": patient_id, "name": f"Pasien #{patient_id}", "owner": {"name": "-"}}

def serialize_hosp(h: Hospitalization, patient_data: dict):
    return {
        "id": h.id,
        "patient_id": h.patient_id,
        "package_price_per_day": h.package_price_per_day,
        "cage_number": h.cage_number,
        "admission_date": h.admission_date,
        "discharge_date": h.discharge_date,
        "status": h.status,
        "patient": patient_data,
        "daily_monitorings": [
            {
                "id": m.id,
                "monitoring_date": m.monitoring_date,
                "appetite": m.appetite,
                "pip": m.pip,
                "pup": m.pup,
                "vomiting": m.vomiting,
                "diarrhea": m.diarrhea,
                "notes": m.notes,
            }
            for m in h.daily_monitorings
        ],
    }

class HospitalizationCreate(BaseModel):
    patient_id: int
    package_price_per_day: int = Field(..., description="35000 atau 50000")
    cage_number: str = Field(..., max_length=50)
    admission_date: str

class MonitoringCreate(BaseModel):
    monitoring_date: str
    appetite: Optional[str] = None
    pip: Optional[str] = None
    pup: Optional[str] = None
    vomiting: bool = False
    diarrhea: bool = False
    notes: Optional[str] = None

class DischargeInput(BaseModel):
    discharge_date: str

@app.get("/hospitalizations")
async def list_hospitalizations(
    status: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    query = db.query(Hospitalization).order_by(Hospitalization.id.desc())
    if status:
        query = query.filter(Hospitalization.status == status)
    items = query.all()
    results = []
    for h in items:
        patient_data = await fetch_patient_info(h.patient_id, authorization)
        results.append(serialize_hosp(h, patient_data))
    return {"status": "success", "data": results}

@app.get("/hospitalizations/{hosp_id}")
async def show_hospitalization(
    hosp_id: int,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    h = db.query(Hospitalization).filter(Hospitalization.id == hosp_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="Data rawat inap tidak ditemukan")
    patient_data = await fetch_patient_info(h.patient_id, authorization)
    return {"status": "success", "data": serialize_hosp(h, patient_data)}

@app.post("/hospitalizations", status_code=201)
async def store_hospitalization(
    payload: HospitalizationCreate,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    if payload.package_price_per_day not in [35000, 50000]:
        raise HTTPException(status_code=422, detail="Tarif paket harus 35000 atau 50000.")

    if db.query(Hospitalization).filter(Hospitalization.patient_id == payload.patient_id, Hospitalization.status == "inpatient").first():
        raise HTTPException(status_code=422, detail="Pasien ini masih berstatus sedang dirawat inap.")

    if db.query(Hospitalization).filter(Hospitalization.cage_number == payload.cage_number, Hospitalization.status == "inpatient").first():
        raise HTTPException(status_code=422, detail="Nomor kandang tersebut sedang digunakan.")

    h = Hospitalization(
        patient_id=payload.patient_id,
        package_price_per_day=payload.package_price_per_day,
        cage_number=payload.cage_number,
        admission_date=payload.admission_date,
        status="inpatient",
    )
    db.add(h)
    db.commit()
    db.refresh(h)
    patient_data = await fetch_patient_info(h.patient_id, authorization)
    return {"status": "success", "message": "Pendaftaran rawat inap berhasil.", "data": serialize_hosp(h, patient_data)}

@app.post("/hospitalizations/{hosp_id}/monitorings", status_code=201)
def store_monitoring(hosp_id: int, payload: MonitoringCreate, db: Session = Depends(get_db)):
    h = db.query(Hospitalization).filter(Hospitalization.id == hosp_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="Data rawat inap tidak ditemukan.")
    if h.status != "inpatient":
        raise HTTPException(status_code=422, detail="Pasien sudah pulang (discharged), tidak bisa menambah monitoring.")

    m = DailyMonitoring(hospitalization_id=hosp_id, **payload.model_dump())
    db.add(m)
    db.commit()
    db.refresh(m)
    return {"status": "success", "message": "Data monitoring harian berhasil disimpan.", "data": m}

@app.patch("/hospitalizations/{hosp_id}/discharge")
def discharge_hospitalization(hosp_id: int, payload: DischargeInput, db: Session = Depends(get_db)):
    h = db.query(Hospitalization).filter(Hospitalization.id == hosp_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="Data rawat inap tidak ditemukan.")
    if h.status == "discharged":
        raise HTTPException(status_code=422, detail="Pasien sudah dipulangkan sebelumnya.")

    d_in = date.fromisoformat(h.admission_date[:10])
    d_out = date.fromisoformat(payload.discharge_date[:10])
    if d_out < d_in:
        raise HTTPException(status_code=422, detail="Tanggal pulang tidak boleh sebelum tanggal masuk.")

    days = max(1, (d_out - d_in).days)
    total_cost = days * h.package_price_per_day

    h.discharge_date = payload.discharge_date
    h.status = "discharged"
    db.commit()
    db.refresh(h)

    return {
        "status": "success",
        "message": "Pasien berhasil dipulangkan.",
        "data": h,
        "billing_summary": {
            "total_days": days,
            "total_cost": total_cost,
        },
    }
