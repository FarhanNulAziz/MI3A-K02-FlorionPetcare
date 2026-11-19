import os
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship

DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:root@db:3306/florion_pharmacy")

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

class Medicine(Base):
    __tablename__ = "medicines"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    unit = Column(String(30), default="Tablet")
    stock = Column(Integer, default=0)
    price = Column(Float, nullable=False)

class Treatment(Base):
    __tablename__ = "treatments"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    price = Column(Float, nullable=False)

class Prescription(Base):
    __tablename__ = "prescriptions"
    id = Column(Integer, primary_key=True, index=True)
    medical_record_id = Column(Integer, nullable=False)
    patient_id = Column(Integer, nullable=False)
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    items = relationship("PrescriptionItem", back_populates="prescription")

class PrescriptionItem(Base):
    __tablename__ = "prescription_items"
    id = Column(Integer, primary_key=True, index=True)
    prescription_id = Column(Integer, ForeignKey("prescriptions.id"))
    medicine_id = Column(Integer, ForeignKey("medicines.id"), nullable=True)
    treatment_id = Column(Integer, ForeignKey("treatments.id"), nullable=True)
    quantity = Column(Integer, default=1)
    dosage_rule = Column(String(150), nullable=True)
    prescription = relationship("Prescription", back_populates="items")

Base.metadata.create_all(bind=engine)

def seed_master_data():
    db = SessionLocal()
    if db.query(Treatment).count() == 0:
        db.add_all([
            Treatment(name="Steril Jantan", price=350000),
            Treatment(name="Operasi Caesar", price=1200000),
            Treatment(name="Cek Jamur (Wood's Lamp)", price=75000),
            Treatment(name="Cek Darah Lengkap", price=250000),
        ])
    if db.query(Medicine).count() == 0:
        db.add_all([
            Medicine(name="Amoxicillin Vet 250mg", unit="Tablet", stock=100, price=5000),
            Medicine(name="Doxycycline 100mg", unit="Kapsul", stock=80, price=7000),
            Medicine(name="Salep Jamur Ketoconazole", unit="Tube", stock=40, price=35000),
        ])
    db.commit()
    db.close()

seed_master_data()
app = FastAPI(title="Florion Pharmacy & Treatment Service (US-2003)")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class MedicineItemInput(BaseModel):
    medicine_id: int
    quantity: int = Field(..., gt=0)
    dosage_rule: str

class TreatmentItemInput(BaseModel):
    treatment_id: int

class PrescriptionCreate(BaseModel):
    medical_record_id: int
    patient_id: int
    notes: Optional[str] = None
    medicines: List[MedicineItemInput] = []
    treatments: List[TreatmentItemInput] = []

@app.get("/master/medicines")
def list_medicines(db: Session = Depends(get_db)):
    return db.query(Medicine).all()

@app.get("/master/treatments")
def list_treatments(db: Session = Depends(get_db)):
    return db.query(Treatment).all()

@app.post("/prescriptions", status_code=201)
def create_prescription(payload: PrescriptionCreate, db: Session = Depends(get_db)):
    prescription = Prescription(medical_record_id=payload.medical_record_id, patient_id=payload.patient_id, notes=payload.notes)
    db.add(prescription)
    db.flush()

    for med_in in payload.medicines:
        med = db.query(Medicine).filter(Medicine.id == med_in.medicine_id).first()
        if not med:
            db.rollback()
            raise HTTPException(status_code=404, detail=f"Obat ID {med_in.medicine_id} tidak ditemukan")
        if med.stock < med_in.quantity:
            db.rollback()
            raise HTTPException(status_code=400, detail=f"Stok {med.name} tidak mencukupi (sisa: {med.stock})")
        med.stock -= med_in.quantity
        db.add(PrescriptionItem(prescription_id=prescription.id, medicine_id=med.id, quantity=med_in.quantity, dosage_rule=med_in.dosage_rule))

    for tr_in in payload.treatments:
        tr = db.query(Treatment).filter(Treatment.id == tr_in.treatment_id).first()
        if not tr:
            db.rollback()
            raise HTTPException(status_code=404, detail=f"Tindakan ID {tr_in.treatment_id} tidak ditemukan")
        db.add(PrescriptionItem(prescription_id=prescription.id, treatment_id=tr.id, quantity=1))

    db.commit()
    return {"message": "Resep & tindakan medis tersimpan, stok obat telah diperbarui", "prescription_id": prescription.id}
