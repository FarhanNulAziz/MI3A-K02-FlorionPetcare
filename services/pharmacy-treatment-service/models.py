from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.orm import relationship

from database import Base


class Medicine(Base):
    __tablename__ = "medicines"
    __table_args__ = (
        CheckConstraint("stock >= 0", name="ck_medicines_stock_non_negative"),
    )

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False, unique=True)
    unit = Column(String(30), nullable=False, default="Tablet")
    stock = Column(Integer, nullable=False, default=0)
    price = Column(Float, nullable=False)
    description = Column(String(255), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)


class Treatment(Base):
    __tablename__ = "treatments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False, unique=True)
    price_min = Column(Float, nullable=True)
    price_max = Column(Float, nullable=True)
    is_relative = Column(Boolean, nullable=False, default=False)
    requires_consent = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    medical_record_id = Column(Integer, nullable=False)
    patient_id = Column(Integer, nullable=False)
    doctor_id = Column(Integer, nullable=False)
    doctor_name = Column(String(100), nullable=False)
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    items = relationship(
        "PrescriptionItem",
        back_populates="prescription",
        cascade="all, delete-orphan",
    )
    treatment_items = relationship(
        "PrescriptionTreatment",
        back_populates="prescription",
        cascade="all, delete-orphan",
    )


class PrescriptionItem(Base):
    """Baris obat pada resep. Tindakan disimpan terpisah."""

    __tablename__ = "prescription_items"

    id = Column(Integer, primary_key=True, index=True)
    prescription_id = Column(
        Integer, ForeignKey("prescriptions.id"), nullable=False
    )
    medicine_id = Column(Integer, ForeignKey("medicines.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    dosage_rule = Column(String(150), nullable=False)
    must_finish = Column(Boolean, nullable=False, default=False)
    unit_price = Column(Float, nullable=False)

    prescription = relationship("Prescription", back_populates="items")
    medicine = relationship("Medicine")


class PrescriptionTreatment(Base):
    """Baris tindakan pada resep, termasuk consent dan tarif yang dikenakan."""

    __tablename__ = "prescription_treatments"

    id = Column(Integer, primary_key=True, index=True)
    prescription_id = Column(
        Integer, ForeignKey("prescriptions.id"), nullable=False
    )
    treatment_id = Column(Integer, ForeignKey("treatments.id"), nullable=False)
    custom_name = Column(String(150), nullable=True)
    price = Column(Float, nullable=False)
    consent_given = Column(Boolean, nullable=False, default=False)
    consent_by = Column(String(150), nullable=True)
    consent_at = Column(DateTime, nullable=True)
    notes = Column(String(255), nullable=True)

    prescription = relationship("Prescription", back_populates="treatment_items")
    treatment = relationship("Treatment")
