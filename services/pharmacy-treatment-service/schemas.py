from typing import List, Optional

from pydantic import BaseModel, Field


class MedicineItemInput(BaseModel):
    medicine_id: int
    quantity: int = Field(..., ge=1)
    dosage_rule: str = Field(..., min_length=3, max_length=150)
    must_finish: bool = False


class TreatmentItemInput(BaseModel):
    treatment_id: int
    custom_name: Optional[str] = Field(None, max_length=150)
    price: Optional[float] = Field(None, ge=0)
    consent_given: bool = False
    consent_by: Optional[str] = Field(None, max_length=150)
    notes: Optional[str] = Field(None, max_length=255)


class PrescriptionCreate(BaseModel):
    medical_record_id: int
    patient_id: int
    notes: Optional[str] = Field(None, max_length=255)
    medicines: List[MedicineItemInput] = []
    treatments: List[TreatmentItemInput] = []


class MedicineCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    unit: str = Field("Tablet", max_length=30)
    stock: int = Field(0, ge=0)
    price: float = Field(..., ge=0)
    description: Optional[str] = Field(None, max_length=255)


class MedicineUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    unit: Optional[str] = Field(None, max_length=30)
    stock: Optional[int] = Field(None, ge=0)
    price: Optional[float] = Field(None, ge=0)
    description: Optional[str] = Field(None, max_length=255)
