from database import SessionLocal
from models import Medicine, Treatment

# Master tindakan sesuai keputusan final klien.
# price_min / price_max / is_relative / requires_consent
TREATMENTS = [
    {
        "name": "Steril Jantan",
        "price_min": 350000,
        "price_max": 350000,
        "is_relative": False,
        "requires_consent": True,
    },
    {
        "name": "Steril Betina",
        "price_min": 550000,
        "price_max": 550000,
        "is_relative": False,
        "requires_consent": True,
    },
    {
        "name": "Caesar",
        "price_min": 600000,
        "price_max": 800000,
        "is_relative": False,
        "requires_consent": True,
    },
    {
        "name": "Cateter",
        "price_min": 350000,
        "price_max": 350000,
        "is_relative": False,
        "requires_consent": True,
    },
    {
        "name": "Cek Jamur",
        "price_min": 35000,
        "price_max": 35000,
        "is_relative": False,
        "requires_consent": False,
    },
    {
        "name": "Cek Tungau",
        "price_min": 35000,
        "price_max": 35000,
        "is_relative": False,
        "requires_consent": False,
    },
    {
        "name": "Cek Darah",
        "price_min": 250000,
        "price_max": 350000,
        "is_relative": False,
        "requires_consent": False,
    },
    {
        "name": "Tindakan Lainnya",
        "price_min": None,
        "price_max": None,
        "is_relative": True,
        "requires_consent": False,
    },
]

# Obat umum hewan. Stok awal hanya dipakai saat baris pertama kali dibuat.
MEDICINES = [
    {
        "name": "Amoxicillin Vet 250mg",
        "unit": "Tablet",
        "stock": 120,
        "price": 5000,
        "description": "Antibiotik umum untuk infeksi bakteri.",
    },
    {
        "name": "Doxycycline 100mg",
        "unit": "Kapsul",
        "stock": 80,
        "price": 7000,
        "description": "Antibiotik untuk infeksi saluran pernapasan.",
    },
    {
        "name": "Salep Jamur Ketoconazole",
        "unit": "Tube",
        "stock": 40,
        "price": 35000,
        "description": "Salep antijamur untuk kulit hewan.",
    },
    {
        "name": "Vitamin B Complex",
        "unit": "Tablet",
        "stock": 150,
        "price": 3000,
        "description": "Suplemen vitamin untuk nafsu makan dan stamina.",
    },
    {
        "name": "Antiparasit",
        "unit": "ml",
        "stock": 90,
        "price": 25000,
        "description": "Obat cacing dan parasit internal.",
    },
    {
        "name": "Cefixime",
        "unit": "Tablet",
        "stock": 80,
        "price": 8000,
        "description": "Antibiotik untuk infeksi saluran pencernaan.",
    },
    {
        "name": "Metronidazol",
        "unit": "Tablet",
        "stock": 100,
        "price": 6000,
        "description": "Antibiotik untuk infeksi anaerob dan protozoa.",
    },
    {
        "name": "Enrofloxacin",
        "unit": "ml",
        "stock": 70,
        "price": 45000,
        "description": "Antibiotik injeksi untuk infeksi bakteri.",
    },
    {
        "name": "Vitamin C",
        "unit": "Tablet",
        "stock": 180,
        "price": 2500,
        "description": "Suplemen daya tahan tubuh.",
    },
    {
        "name": "Obat Kutu",
        "unit": "Botol",
        "stock": 110,
        "price": 30000,
        "description": "Obat kutu dan pinjal untuk anjing dan kucing.",
    },
]


def seed_master_data():
    """Seeder idempotent: upsert berdasarkan nama, aman dijalankan berulang."""
    db = SessionLocal()
    try:
        active_treatment_names = set()
        for data in TREATMENTS:
            active_treatment_names.add(data["name"])
            treatment = (
                db.query(Treatment).filter(Treatment.name == data["name"]).first()
            )
            if treatment is None:
                db.add(Treatment(**data, is_active=True))
            else:
                for key, value in data.items():
                    setattr(treatment, key, value)
                treatment.is_active = True

        # Nonaktifkan entri seed lama yang tidak ada di daftar final.
        for treatment in (
            db.query(Treatment).filter(Treatment.is_active.is_(True)).all()
        ):
            if treatment.name not in active_treatment_names:
                treatment.is_active = False

        for data in MEDICINES:
            medicine = (
                db.query(Medicine).filter(Medicine.name == data["name"]).first()
            )
            if medicine is None:
                db.add(Medicine(**data, is_active=True))
            else:
                # Stok dipertahankan agar restart service tidak mereset stok.
                medicine.unit = data["unit"]
                medicine.price = data["price"]
                medicine.description = data.get("description")
                medicine.is_active = True

        db.commit()
    finally:
        db.close()
