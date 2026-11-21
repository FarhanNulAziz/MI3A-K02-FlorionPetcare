import os
from datetime import datetime
from typing import Optional

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from auth import require_roles
from database import Base, SessionLocal, engine, get_db
from models import (
    Medicine,
    Prescription,
    PrescriptionItem,
    PrescriptionTreatment,
    Treatment,
)
from schemas import (
    MedicineCreate,
    MedicineUpdate,
    PrescriptionCreate,
)
from seed import seed_master_data

# Catatan: Base.metadata.create_all TIDAK mengubah tabel yang sudah ada.
# Setelah perubahan skema, database dev perlu di-drop lalu service di-restart.
Base.metadata.create_all(bind=engine)
seed_master_data()

EMR_SERVICE_URL = os.getenv("EMR_SERVICE_URL", "http://emr-service:8000")

app = FastAPI(title="Florion Pharmacy & Treatment Service (US-2003)")


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------
def _iso(value):
    return value.isoformat() if value else None


def _rupiah(value) -> str:
    if value is None:
        return "-"
    return f"{value:g}"


def _as_int(value, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _num(value):
    """Tampilkan angka bulat sebagai int agar sesuai kontrak contoh JSON."""
    if value is None:
        return None
    if isinstance(value, float) and value.is_integer():
        return int(value)
    return value


def _normalize_total(total: float):
    return int(total) if float(total).is_integer() else total


def serialize_medicine(medicine: Medicine) -> dict:
    return {
        "id": medicine.id,
        "name": medicine.name,
        "unit": medicine.unit,
        "stock": medicine.stock,
        "price": _num(medicine.price),
        "description": medicine.description,
        "is_active": medicine.is_active,
    }


def _treatment_price_type(treatment: Treatment) -> str:
    if treatment.is_relative:
        return "relative"
    if (
        treatment.price_min is not None
        and treatment.price_max is not None
        and treatment.price_min == treatment.price_max
    ):
        return "fixed"
    return "range"


def serialize_treatment(treatment: Treatment) -> dict:
    price_type = _treatment_price_type(treatment)
    return {
        "id": treatment.id,
        "name": treatment.name,
        "price_min": _num(treatment.price_min),
        "price_max": _num(treatment.price_max),
        "price": _num(treatment.price_min) if price_type == "fixed" else None,
        "price_type": price_type,
        "is_relative": treatment.is_relative,
        "requires_consent": treatment.requires_consent,
    }


def serialize_prescription(prescription: Prescription) -> dict:
    medicines = []
    total = 0.0

    for item in prescription.items:
        total += (item.unit_price or 0) * (item.quantity or 0)
        medicines.append(
            {
                "id": item.id,
                "medicine_id": item.medicine_id,
                "medicine_name": item.medicine.name if item.medicine else None,
                "unit": item.medicine.unit if item.medicine else None,
                "quantity": item.quantity,
                "dosage_rule": item.dosage_rule,
                "must_finish": item.must_finish,
                "unit_price": _num(item.unit_price),
            }
        )

    treatments = []
    for item in prescription.treatment_items:
        total += item.price or 0
        treatments.append(
            {
                "id": item.id,
                "treatment_id": item.treatment_id,
                "treatment_name": item.treatment.name if item.treatment else None,
                "custom_name": item.custom_name,
                "price": _num(item.price),
                "requires_consent": (
                    item.treatment.requires_consent if item.treatment else False
                ),
                "consent_given": item.consent_given,
                "consent_by": item.consent_by,
                "consent_at": _iso(item.consent_at),
                "notes": item.notes,
            }
        )

    return {
        "id": prescription.id,
        "medical_record_id": prescription.medical_record_id,
        "patient_id": prescription.patient_id,
        "doctor_id": prescription.doctor_id,
        "doctor_name": prescription.doctor_name,
        "notes": prescription.notes,
        "created_at": _iso(prescription.created_at),
        "medicines": medicines,
        "treatments": treatments,
        "total": _normalize_total(total),
    }


def _prescription_query(db: Session):
    return db.query(Prescription).options(
        joinedload(Prescription.items).joinedload(PrescriptionItem.medicine),
        joinedload(Prescription.treatment_items).joinedload(
            PrescriptionTreatment.treatment
        ),
    )


def validate_medical_record(
    patient_id: int, medical_record_id: int, authorization: Optional[str]
) -> None:
    """Pastikan medical_record_id ada di timeline EMR milik pasien."""
    url = f"{EMR_SERVICE_URL}/patients/{patient_id}/medical-records"
    try:
        response = httpx.get(
            url,
            headers={"Authorization": authorization or ""},
            timeout=5.0,
        )
    except httpx.HTTPError:
        raise HTTPException(
            status_code=503, detail="Layanan rekam medis tidak tersedia"
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=503, detail="Layanan rekam medis tidak tersedia"
        )

    try:
        payload = response.json()
    except ValueError:
        raise HTTPException(
            status_code=503, detail="Layanan rekam medis tidak tersedia"
        )

    timeline = payload.get("timeline") or []
    record_ids = set()
    for record in timeline:
        try:
            record_ids.add(int(record.get("id")))
        except (TypeError, ValueError):
            continue

    if medical_record_id not in record_ids:
        raise HTTPException(
            status_code=404, detail="Rekam medis tidak ditemukan untuk pasien ini"
        )


# ---------------------------------------------------------------------------
# Master obat
# ---------------------------------------------------------------------------
@app.get("/master/medicines")
def list_medicines(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    user: dict = Depends(require_roles("admin", "dokter", "paramedik")),
):
    query = db.query(Medicine).filter(Medicine.is_active.is_(True))
    if search:
        query = query.filter(Medicine.name.ilike(f"%{search}%"))
    medicines = query.order_by(Medicine.name.asc()).all()
    return [serialize_medicine(medicine) for medicine in medicines]


@app.post("/master/medicines", status_code=201)
def create_medicine(
    payload: MedicineCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(require_roles("admin", "manajer")),
):
    duplicate = (
        db.query(Medicine)
        .filter(func.lower(Medicine.name) == payload.name.lower())
        .first()
    )
    if duplicate:
        raise HTTPException(status_code=409, detail="Nama obat sudah digunakan")

    medicine = Medicine(**payload.model_dump(), is_active=True)
    db.add(medicine)
    db.commit()
    db.refresh(medicine)
    return {
        "message": "Obat berhasil ditambahkan",
        "data": serialize_medicine(medicine),
    }


@app.put("/master/medicines/{medicine_id}")
def update_medicine(
    medicine_id: int,
    payload: MedicineUpdate,
    db: Session = Depends(get_db),
    user: dict = Depends(require_roles("admin", "manajer")),
):
    medicine = db.query(Medicine).filter(Medicine.id == medicine_id).first()
    if not medicine:
        raise HTTPException(status_code=404, detail="Obat tidak ditemukan")

    data = payload.model_dump(exclude_unset=True)
    for required_field in ("name", "unit", "stock", "price"):
        if required_field in data and data[required_field] is None:
            data.pop(required_field)

    if "name" in data:
        duplicate = (
            db.query(Medicine)
            .filter(
                func.lower(Medicine.name) == data["name"].lower(),
                Medicine.id != medicine_id,
            )
            .first()
        )
        if duplicate:
            raise HTTPException(status_code=409, detail="Nama obat sudah digunakan")

    for key, value in data.items():
        setattr(medicine, key, value)

    db.commit()
    db.refresh(medicine)
    return {
        "message": "Data obat berhasil diperbarui",
        "data": serialize_medicine(medicine),
    }


@app.delete("/master/medicines/{medicine_id}")
def deactivate_medicine(
    medicine_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(require_roles("admin", "manajer")),
):
    medicine = db.query(Medicine).filter(Medicine.id == medicine_id).first()
    if not medicine:
        raise HTTPException(status_code=404, detail="Obat tidak ditemukan")

    medicine.is_active = False
    db.commit()
    return {"message": "Obat berhasil dinonaktifkan"}


# ---------------------------------------------------------------------------
# Master tindakan
# ---------------------------------------------------------------------------
@app.get("/master/treatments")
def list_treatments(
    db: Session = Depends(get_db),
    user: dict = Depends(require_roles("admin", "dokter", "paramedik")),
):
    treatments = (
        db.query(Treatment)
        .filter(Treatment.is_active.is_(True))
        .order_by(Treatment.name.asc())
        .all()
    )
    return [serialize_treatment(treatment) for treatment in treatments]


# ---------------------------------------------------------------------------
# Resep & tindakan medis
# ---------------------------------------------------------------------------
@app.post("/prescriptions", status_code=201)
def create_prescription(
    payload: PrescriptionCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(require_roles("dokter")),
    authorization: Optional[str] = Header(None),
):
    if not payload.medicines and not payload.treatments:
        raise HTTPException(
            status_code=422,
            detail="Resep harus berisi minimal satu obat atau tindakan",
        )

    validate_medical_record(
        payload.patient_id, payload.medical_record_id, authorization
    )

    try:
        # --- Validasi obat ---------------------------------------------------
        medicine_rows = []
        seen_medicines = set()
        for medicine_input in payload.medicines:
            medicine = (
                db.query(Medicine)
                .filter(Medicine.id == medicine_input.medicine_id)
                .with_for_update()
                .first()
            )
            if not medicine:
                raise HTTPException(
                    status_code=404,
                    detail=f"Obat ID {medicine_input.medicine_id} tidak ditemukan",
                )
            if not medicine.is_active:
                raise HTTPException(
                    status_code=422,
                    detail=f"Obat {medicine.name} sudah tidak aktif",
                )
            if medicine.id in seen_medicines:
                raise HTTPException(
                    status_code=422,
                    detail=f"Obat {medicine.name} dipilih lebih dari sekali",
                )
            seen_medicines.add(medicine.id)

            if medicine.stock < medicine_input.quantity:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        f"Stok {medicine.name} tidak mencukupi "
                        f"(sisa: {medicine.stock})"
                    ),
                )
            medicine_rows.append((medicine_input, medicine))

        # --- Validasi tindakan ----------------------------------------------
        treatment_rows = []
        seen_treatments = set()
        for treatment_input in payload.treatments:
            treatment = (
                db.query(Treatment)
                .filter(Treatment.id == treatment_input.treatment_id)
                .first()
            )
            if not treatment:
                raise HTTPException(
                    status_code=404,
                    detail=(
                        f"Tindakan ID {treatment_input.treatment_id} "
                        "tidak ditemukan"
                    ),
                )
            if not treatment.is_active:
                raise HTTPException(
                    status_code=422,
                    detail=f"Tindakan {treatment.name} sudah tidak aktif",
                )

            custom_name = treatment_input.custom_name
            price = treatment_input.price

            if treatment.is_relative:
                if not custom_name or not custom_name.strip():
                    raise HTTPException(
                        status_code=422,
                        detail=(
                            "Tindakan Lainnya wajib mengisi nama tindakan "
                            "(custom_name)"
                        ),
                    )
                if price is None:
                    raise HTTPException(
                        status_code=422,
                        detail="Tindakan Lainnya wajib mengisi tarif tindakan",
                    )
                custom_name = custom_name.strip()
            else:
                if treatment.id in seen_treatments:
                    raise HTTPException(
                        status_code=422,
                        detail=f"Tindakan {treatment.name} dipilih lebih dari sekali",
                    )
                seen_treatments.add(treatment.id)
                # custom_name diabaikan untuk tindakan non-relatif.
                custom_name = None

                if treatment.price_min is None or treatment.price_max is None:
                    raise HTTPException(
                        status_code=422,
                        detail=f"Tarif tindakan {treatment.name} belum diatur",
                    )

                if treatment.price_min == treatment.price_max:
                    # Tarif tetap: boleh kosong, kalau diisi harus sama.
                    if price is None:
                        price = treatment.price_min
                    elif float(price) != float(treatment.price_min):
                        raise HTTPException(
                            status_code=422,
                            detail=(
                                f"Tarif tindakan {treatment.name} harus "
                                f"Rp{_rupiah(treatment.price_min)}"
                            ),
                        )
                else:
                    # Tarif rentang: wajib dan inklusif.
                    if price is None:
                        raise HTTPException(
                            status_code=422,
                            detail=(
                                f"Tarif tindakan {treatment.name} wajib diisi "
                                f"antara Rp{_rupiah(treatment.price_min)} dan "
                                f"Rp{_rupiah(treatment.price_max)}"
                            ),
                        )
                    if price < treatment.price_min or price > treatment.price_max:
                        raise HTTPException(
                            status_code=422,
                            detail=(
                                f"Tarif tindakan {treatment.name} harus di antara "
                                f"Rp{_rupiah(treatment.price_min)} dan "
                                f"Rp{_rupiah(treatment.price_max)}"
                            ),
                        )

            if treatment.requires_consent:
                if (
                    not treatment_input.consent_given
                    or not treatment_input.consent_by
                    or not treatment_input.consent_by.strip()
                ):
                    raise HTTPException(
                        status_code=422,
                        detail=(
                            f"Tindakan {treatment.name} memerlukan persetujuan "
                            "pemilik hewan"
                        ),
                    )

            consent_given = bool(treatment_input.consent_given)
            consent_by = (
                treatment_input.consent_by.strip()
                if consent_given and treatment_input.consent_by
                else None
            )
            # consent_at selalu dari server, nilai client diabaikan.
            consent_at = datetime.utcnow() if consent_given else None

            treatment_rows.append(
                (
                    treatment_input,
                    treatment,
                    custom_name,
                    price,
                    consent_given,
                    consent_by,
                    consent_at,
                )
            )

        # --- Simpan dalam satu transaksi ------------------------------------
        prescription = Prescription(
            medical_record_id=payload.medical_record_id,
            patient_id=payload.patient_id,
            doctor_id=_as_int(user.get("sub"), 0),
            doctor_name=user.get("name") or "Dokter Klinik",
            notes=payload.notes,
        )
        db.add(prescription)
        db.flush()

        for medicine_input, medicine in medicine_rows:
            medicine.stock -= medicine_input.quantity
            db.add(
                PrescriptionItem(
                    prescription_id=prescription.id,
                    medicine_id=medicine.id,
                    quantity=medicine_input.quantity,
                    dosage_rule=medicine_input.dosage_rule,
                    must_finish=medicine_input.must_finish,
                    unit_price=medicine.price,
                )
            )

        for (
            treatment_input,
            treatment,
            custom_name,
            price,
            consent_given,
            consent_by,
            consent_at,
        ) in treatment_rows:
            db.add(
                PrescriptionTreatment(
                    prescription_id=prescription.id,
                    treatment_id=treatment.id,
                    custom_name=custom_name,
                    price=price,
                    consent_given=consent_given,
                    consent_by=consent_by,
                    consent_at=consent_at,
                    notes=treatment_input.notes,
                )
            )

        db.commit()
        db.refresh(prescription)
        data = serialize_prescription(prescription)
        return {
            "message": (
                "Resep & tindakan medis tersimpan, stok obat telah diperbarui"
            ),
            "prescription_id": prescription.id,
            "data": data,
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise


@app.get("/prescriptions")
def list_prescriptions(
    medical_record_id: Optional[int] = None,
    patient_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: dict = Depends(require_roles("admin", "dokter", "paramedik")),
):
    if medical_record_id is None and patient_id is None:
        raise HTTPException(
            status_code=422,
            detail=(
                "Minimal satu filter diperlukan: medical_record_id atau patient_id"
            ),
        )

    query = _prescription_query(db)
    if medical_record_id is not None:
        query = query.filter(Prescription.medical_record_id == medical_record_id)
    if patient_id is not None:
        query = query.filter(Prescription.patient_id == patient_id)

    prescriptions = query.order_by(
        Prescription.created_at.desc(), Prescription.id.desc()
    ).all()

    return {
        "total": len(prescriptions),
        "data": [serialize_prescription(item) for item in prescriptions],
    }


@app.get("/prescriptions/{prescription_id}")
def get_prescription(
    prescription_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(require_roles("admin", "dokter", "paramedik")),
):
    prescription = (
        _prescription_query(db)
        .filter(Prescription.id == prescription_id)
        .first()
    )
    if not prescription:
        raise HTTPException(status_code=404, detail="Resep tidak ditemukan")
    return {"data": serialize_prescription(prescription)}


@app.delete("/prescriptions/{prescription_id}")
def delete_prescription(
    prescription_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(require_roles("dokter")),
):
    prescription = (
        _prescription_query(db)
        .filter(Prescription.id == prescription_id)
        .first()
    )
    if not prescription:
        raise HTTPException(status_code=404, detail="Resep tidak ditemukan")

    try:
        # Kembalikan stok obat sebelum baris resep dihapus.
        for item in prescription.items:
            medicine = (
                db.query(Medicine)
                .filter(Medicine.id == item.medicine_id)
                .with_for_update()
                .first()
            )
            if medicine:
                medicine.stock += item.quantity

        db.delete(prescription)
        db.commit()
    except Exception:
        db.rollback()
        raise

    return {"message": "Resep dihapus dan stok obat telah dikembalikan"}
