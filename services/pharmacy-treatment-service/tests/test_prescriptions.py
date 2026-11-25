import os
import sys

# Pastikan direktori service ada di sys.path dan konfigurasi test dipasang
# SEBELUM main diimpor (engine & JWT_SECRET dibaca saat import).
SERVICE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if SERVICE_DIR not in sys.path:
    sys.path.insert(0, SERVICE_DIR)

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["JWT_SECRET"] = "florion_secret_key"
os.environ["EMR_SERVICE_URL"] = "http://emr-service:8000"

import httpx  # noqa: E402
import jwt  # noqa: E402
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402
import seed as seed_module  # noqa: E402

SECRET = "florion_secret_key"


# ---------------------------------------------------------------------------
# Helper & fixture
# ---------------------------------------------------------------------------
def auth_header(role="dokter", sub=3, name="drh. Test"):
    token = jwt.encode(
        {"role": role, "sub": sub, "name": name}, SECRET, algorithm="HS256"
    )
    return {"Authorization": f"Bearer {token}"}


def _medicine_id(name):
    db = main.SessionLocal()
    try:
        return db.query(main.Medicine).filter_by(name=name).one().id
    finally:
        db.close()


def _treatment_id(name):
    db = main.SessionLocal()
    try:
        return db.query(main.Treatment).filter_by(name=name).one().id
    finally:
        db.close()


def _medicine_stock(name):
    db = main.SessionLocal()
    try:
        return db.query(main.Medicine).filter_by(name=name).one().stock
    finally:
        db.close()


def _prescription_count():
    db = main.SessionLocal()
    try:
        return db.query(main.Prescription).count()
    finally:
        db.close()


class FakeResponse:
    def __init__(self, status_code=200, payload=None):
        self.status_code = status_code
        self._payload = payload or {}

    def json(self):
        return self._payload


@pytest.fixture(autouse=True)
def clean_db():
    main.Base.metadata.drop_all(bind=main.engine)
    main.Base.metadata.create_all(bind=main.engine)
    main.seed_master_data()
    yield


@pytest.fixture(autouse=True)
def emr_ok(monkeypatch):
    def fake_get(url, headers=None, timeout=None):
        return FakeResponse(200, {"timeline": [{"id": 1}, {"id": 2}]})

    monkeypatch.setattr(main.httpx, "get", fake_get)


@pytest.fixture
def client():
    return TestClient(main.app)


def _create_prescription(client, body, role="dokter"):
    return client.post(
        "/prescriptions", json=body, headers=auth_header(role)
    )


def _base_body(**overrides):
    body = {
        "medical_record_id": 1,
        "patient_id": 2,
        "notes": "kontrol rutin",
        "medicines": [],
        "treatments": [],
    }
    body.update(overrides)
    return body


# ---------------------------------------------------------------------------
# Skenario utama
# ---------------------------------------------------------------------------
def test_dokter_menyimpan_resep_dan_stok_berkurang(client):
    medicine = "Amoxicillin Vet 250mg"
    medicine_id = _medicine_id(medicine)
    steril_id = _treatment_id("Steril Jantan")
    stock_before = _medicine_stock(medicine)

    body = _base_body(
        medicines=[
            {
                "medicine_id": medicine_id,
                "quantity": 10,
                "dosage_rule": "3x1 sesudah makan",
                "must_finish": True,
            }
        ],
        treatments=[
            {
                "treatment_id": steril_id,
                "consent_given": True,
                "consent_by": "Budi Santoso",
            }
        ],
    )

    response = _create_prescription(client, body)
    assert response.status_code == 201, response.text

    payload = response.json()
    assert payload["prescription_id"] == payload["data"]["id"]
    data = payload["data"]
    assert data["doctor_id"] == 3
    assert data["doctor_name"] == "drh. Test"
    assert data["total"] == 400000

    assert data["medicines"][0]["medicine_name"] == medicine
    assert data["medicines"][0]["unit_price"] == 5000
    assert data["medicines"][0]["quantity"] == 10
    assert data["treatments"][0]["treatment_name"] == "Steril Jantan"
    assert data["treatments"][0]["price"] == 350000
    assert data["treatments"][0]["requires_consent"] is True
    assert data["treatments"][0]["consent_at"] is not None

    assert _medicine_stock(medicine) == stock_before - 10

    get_response = client.get(
        "/prescriptions?medical_record_id=1", headers=auth_header("dokter")
    )
    assert get_response.status_code == 200
    listing = get_response.json()
    assert listing["total"] == 1
    assert listing["data"][0]["id"] == data["id"]
    assert listing["data"][0]["total"] == 400000
    assert listing["data"][0]["medicines"] == data["medicines"]
    assert listing["data"][0]["treatments"] == data["treatments"]

    detail = client.get(
        f"/prescriptions/{data['id']}", headers=auth_header("dokter")
    )
    assert detail.status_code == 200
    assert detail.json()["data"]["id"] == data["id"]


def test_stok_kurang_409_dan_tidak_ada_perubahan(client):
    medicine = "Amoxicillin Vet 250mg"
    medicine_id = _medicine_id(medicine)
    stock_before = _medicine_stock(medicine)

    body = _base_body(
        medicines=[
            {
                "medicine_id": medicine_id,
                "quantity": 9999,
                "dosage_rule": "3x1 sesudah makan",
            }
        ]
    )

    response = _create_prescription(client, body)
    assert response.status_code == 409
    assert "tidak mencukupi" in response.json()["detail"]
    assert _medicine_stock(medicine) == stock_before
    assert _prescription_count() == 0


def test_stok_kurang_pada_obat_kedua_tidak_mengurangi_obat_pertama(client):
    first = "Amoxicillin Vet 250mg"
    second = "Doxycycline 100mg"
    first_stock = _medicine_stock(first)

    body = _base_body(
        medicines=[
            {
                "medicine_id": _medicine_id(first),
                "quantity": 5,
                "dosage_rule": "2x1 sesudah makan",
            },
            {
                "medicine_id": _medicine_id(second),
                "quantity": 9999,
                "dosage_rule": "2x1 sesudah makan",
            },
        ]
    )

    response = _create_prescription(client, body)
    assert response.status_code == 409
    assert _medicine_stock(first) == first_stock
    assert _prescription_count() == 0


def test_delete_resep_mengembalikan_stok(client):
    medicine = "Doxycycline 100mg"
    medicine_id = _medicine_id(medicine)
    stock_before = _medicine_stock(medicine)

    body = _base_body(
        medicines=[
            {
                "medicine_id": medicine_id,
                "quantity": 7,
                "dosage_rule": "2x1 sesudah makan",
            }
        ]
    )
    created = _create_prescription(client, body)
    assert created.status_code == 201
    prescription_id = created.json()["prescription_id"]
    assert _medicine_stock(medicine) == stock_before - 7

    deleted = client.delete(
        f"/prescriptions/{prescription_id}", headers=auth_header("dokter")
    )
    assert deleted.status_code == 200
    assert _medicine_stock(medicine) == stock_before

    missing = client.get(
        f"/prescriptions/{prescription_id}", headers=auth_header("dokter")
    )
    assert missing.status_code == 404


def test_resep_kosong_422(client):
    response = _create_prescription(client, _base_body())
    assert response.status_code == 422
    assert "minimal satu obat atau tindakan" in response.json()["detail"]


# ---------------------------------------------------------------------------
# Validasi obat
# ---------------------------------------------------------------------------
def test_obat_duplikat_422(client):
    medicine_id = _medicine_id("Amoxicillin Vet 250mg")
    body = _base_body(
        medicines=[
            {
                "medicine_id": medicine_id,
                "quantity": 1,
                "dosage_rule": "1x1",
            },
            {
                "medicine_id": medicine_id,
                "quantity": 1,
                "dosage_rule": "1x1",
            },
        ]
    )
    response = _create_prescription(client, body)
    assert response.status_code == 422
    assert "dipilih lebih dari sekali" in response.json()["detail"]


def test_obat_nonaktif_422(client):
    medicine = "Amoxicillin Vet 250mg"
    medicine_id = _medicine_id(medicine)

    db = main.SessionLocal()
    try:
        db.query(main.Medicine).filter_by(id=medicine_id).one().is_active = False
        db.commit()
    finally:
        db.close()

    body = _base_body(
        medicines=[
            {
                "medicine_id": medicine_id,
                "quantity": 1,
                "dosage_rule": "1x1",
            }
        ]
    )
    response = _create_prescription(client, body)
    assert response.status_code == 422
    assert "sudah tidak aktif" in response.json()["detail"]


def test_obat_tidak_ada_404(client):
    body = _base_body(
        medicines=[
            {
                "medicine_id": 999999,
                "quantity": 1,
                "dosage_rule": "1x1",
            }
        ]
    )
    response = _create_prescription(client, body)
    assert response.status_code == 404
    assert "tidak ditemukan" in response.json()["detail"]


def test_dosage_rule_kurang_dari_3_karakter_422(client):
    body = _base_body(
        medicines=[
            {
                "medicine_id": _medicine_id("Amoxicillin Vet 250mg"),
                "quantity": 1,
                "dosage_rule": "1x",
            }
        ]
    )
    response = _create_prescription(client, body)
    assert response.status_code == 422
    assert isinstance(response.json()["detail"], list)


# ---------------------------------------------------------------------------
# Tarif tindakan
# ---------------------------------------------------------------------------
def test_tarif_tetap_steril_terisi_otomatis(client):
    steril_jantan = _treatment_id("Steril Jantan")
    steril_betina = _treatment_id("Steril Betina")

    jantan = _create_prescription(
        client,
        _base_body(
            treatments=[
                {
                    "treatment_id": steril_jantan,
                    "consent_given": True,
                    "consent_by": "Budi Santoso",
                }
            ]
        ),
    )
    assert jantan.status_code == 201, jantan.text
    assert jantan.json()["data"]["treatments"][0]["price"] == 350000

    betina = _create_prescription(
        client,
        _base_body(
            treatments=[
                {
                    "treatment_id": steril_betina,
                    "consent_given": True,
                    "consent_by": "Budi Santoso",
                }
            ]
        ),
    )
    assert betina.status_code == 201, betina.text
    assert betina.json()["data"]["treatments"][0]["price"] == 550000


def test_tarif_tetap_tidak_boleh_berbeda(client):
    steril_id = _treatment_id("Steril Jantan")
    response = _create_prescription(
        client,
        _base_body(
            treatments=[
                {
                    "treatment_id": steril_id,
                    "price": 300000,
                    "consent_given": True,
                    "consent_by": "Budi Santoso",
                }
            ]
        ),
    )
    assert response.status_code == 422
    assert "Rp350000" in response.json()["detail"]


def test_caesar_rentang_harga(client):
    caesar_id = _treatment_id("Caesar")
    consent = {"consent_given": True, "consent_by": "Budi Santoso"}

    outside = _create_prescription(
        client,
        _base_body(
            treatments=[{"treatment_id": caesar_id, "price": 500000, **consent}]
        ),
    )
    assert outside.status_code == 422
    assert "600000" in outside.json()["detail"]
    assert "800000" in outside.json()["detail"]

    inside = _create_prescription(
        client,
        _base_body(
            treatments=[{"treatment_id": caesar_id, "price": 700000, **consent}]
        ),
    )
    assert inside.status_code == 201, inside.text
    assert inside.json()["data"]["treatments"][0]["price"] == 700000

    missing = _create_prescription(
        client,
        _base_body(treatments=[{"treatment_id": caesar_id, **consent}]),
    )
    assert missing.status_code == 422
    assert "wajib diisi" in missing.json()["detail"]


def test_cek_darah_rentang_harga(client):
    cek_darah_id = _treatment_id("Cek Darah")

    outside = _create_prescription(
        client,
        _base_body(
            treatments=[{"treatment_id": cek_darah_id, "price": 200000}]
        ),
    )
    assert outside.status_code == 422

    inside = _create_prescription(
        client,
        _base_body(
            treatments=[{"treatment_id": cek_darah_id, "price": 300000}]
        ),
    )
    assert inside.status_code == 201, inside.text
    assert inside.json()["data"]["treatments"][0]["price"] == 300000

    missing = _create_prescription(
        client, _base_body(treatments=[{"treatment_id": cek_darah_id}])
    )
    assert missing.status_code == 422


def test_tindakan_lainnya_relatif(client):
    lainnya_id = _treatment_id("Tindakan Lainnya")

    tanpa_nama = _create_prescription(
        client,
        _base_body(
            treatments=[{"treatment_id": lainnya_id, "price": 75000}]
        ),
    )
    assert tanpa_nama.status_code == 422
    assert "custom_name" in tanpa_nama.json()["detail"]

    tanpa_harga = _create_prescription(
        client,
        _base_body(
            treatments=[
                {
                    "treatment_id": lainnya_id,
                    "custom_name": "Perawatan luka",
                }
            ]
        ),
    )
    assert tanpa_harga.status_code == 422
    assert "tarif" in tanpa_harga.json()["detail"]

    dua_entri = _create_prescription(
        client,
        _base_body(
            treatments=[
                {
                    "treatment_id": lainnya_id,
                    "custom_name": "Perawatan luka",
                    "price": 75000,
                },
                {
                    "treatment_id": lainnya_id,
                    "custom_name": "Pembersihan telinga",
                    "price": 50000,
                },
            ]
        ),
    )
    assert dua_entri.status_code == 201, dua_entri.text
    data = dua_entri.json()["data"]
    assert len(data["treatments"]) == 2
    assert data["treatments"][0]["custom_name"] == "Perawatan luka"
    assert data["treatments"][1]["custom_name"] == "Pembersihan telinga"
    assert data["total"] == 125000


def test_tindakan_non_relatif_duplikat_422(client):
    cek_jamur = _treatment_id("Cek Jamur")
    body = _base_body(
        treatments=[
            {"treatment_id": cek_jamur},
            {"treatment_id": cek_jamur},
        ]
    )
    response = _create_prescription(client, body)
    assert response.status_code == 422
    assert "dipilih lebih dari sekali" in response.json()["detail"]


# ---------------------------------------------------------------------------
# Consent
# ---------------------------------------------------------------------------
def test_tindakan_wajib_consent_tanpa_consent_422(client):
    for name in ["Steril Jantan", "Steril Betina", "Caesar", "Cateter"]:
        treatment_id = _treatment_id(name)
        item = {"treatment_id": treatment_id}
        if name == "Caesar":
            # Caesar bertarif rentang, isi harga yang valid agar yang diuji
            # murni validasi consent.
            item["price"] = 700000
        body = _base_body(treatments=[item])
        response = _create_prescription(client, body)
        assert response.status_code == 422, name
        assert "memerlukan persetujuan" in response.json()["detail"], name


def test_consent_tanpa_consent_by_422(client):
    steril_id = _treatment_id("Steril Jantan")
    response = _create_prescription(
        client,
        _base_body(
            treatments=[{"treatment_id": steril_id, "consent_given": True}]
        ),
    )
    assert response.status_code == 422
    assert "memerlukan persetujuan" in response.json()["detail"]


def test_consent_at_diisi_server(client):
    steril_id = _treatment_id("Steril Jantan")
    response = _create_prescription(
        client,
        _base_body(
            treatments=[
                {
                    "treatment_id": steril_id,
                    "consent_given": True,
                    "consent_by": "Budi Santoso",
                }
            ]
        ),
    )
    assert response.status_code == 201, response.text
    treatment = response.json()["data"]["treatments"][0]
    assert treatment["consent_given"] is True
    assert treatment["consent_by"] == "Budi Santoso"
    assert treatment["consent_at"] is not None


def test_tindakan_tanpa_consent_tetap_sukses(client):
    jamur = _create_prescription(
        client,
        _base_body(
            treatments=[{"treatment_id": _treatment_id("Cek Jamur")}]
        ),
    )
    assert jamur.status_code == 201, jamur.text
    assert jamur.json()["data"]["treatments"][0]["consent_at"] is None

    tungau = _create_prescription(
        client,
        _base_body(
            treatments=[{"treatment_id": _treatment_id("Cek Tungau")}]
        ),
    )
    assert tungau.status_code == 201, tungau.text

    darah = _create_prescription(
        client,
        _base_body(
            treatments=[
                {"treatment_id": _treatment_id("Cek Darah"), "price": 300000}
            ]
        ),
    )
    assert darah.status_code == 201, darah.text


# ---------------------------------------------------------------------------
# Validasi EMR
# ---------------------------------------------------------------------------
def test_medical_record_tidak_ada_404(client, monkeypatch):
    def fake_get(url, headers=None, timeout=None):
        return FakeResponse(200, {"timeline": [{"id": 2}]})

    monkeypatch.setattr(main.httpx, "get", fake_get)

    body = _base_body(
        medicines=[
            {
                "medicine_id": _medicine_id("Amoxicillin Vet 250mg"),
                "quantity": 1,
                "dosage_rule": "1x1",
            }
        ]
    )
    response = _create_prescription(client, body)
    assert response.status_code == 404
    assert "Rekam medis tidak ditemukan" in response.json()["detail"]
    assert _prescription_count() == 0


def test_emr_mati_503(client, monkeypatch):
    def fake_get(url, headers=None, timeout=None):
        raise httpx.ConnectError("EMR tidak terjangkau")

    monkeypatch.setattr(main.httpx, "get", fake_get)

    body = _base_body(
        medicines=[
            {
                "medicine_id": _medicine_id("Amoxicillin Vet 250mg"),
                "quantity": 1,
                "dosage_rule": "1x1",
            }
        ]
    )
    response = _create_prescription(client, body)
    assert response.status_code == 503
    assert "tidak tersedia" in response.json()["detail"]


# ---------------------------------------------------------------------------
# Role & autentikasi
# ---------------------------------------------------------------------------
def test_paramedik_boleh_get_tetapi_tidak_boleh_post(client):
    get_response = client.get(
        "/master/medicines", headers=auth_header("paramedik")
    )
    assert get_response.status_code == 200

    post_response = client.post(
        "/prescriptions",
        json=_base_body(
            medicines=[
                {
                    "medicine_id": _medicine_id("Amoxicillin Vet 250mg"),
                    "quantity": 1,
                    "dosage_rule": "1x1",
                }
            ]
        ),
        headers=auth_header("paramedik"),
    )
    assert post_response.status_code == 403


def test_pemilik_ditolak_403(client):
    response = client.get("/master/treatments", headers=auth_header("pemilik"))
    assert response.status_code == 403


def test_tanpa_token_401(client):
    response = client.get("/master/medicines")
    assert response.status_code == 401


def test_kelola_master_obat_hanya_admin_manajer(client):
    payload = {
        "name": "Obat Baru",
        "unit": "Tablet",
        "stock": 10,
        "price": 1000,
    }
    dokter = client.post(
        "/master/medicines", json=payload, headers=auth_header("dokter")
    )
    assert dokter.status_code == 403

    admin = client.post(
        "/master/medicines", json=payload, headers=auth_header("admin")
    )
    assert admin.status_code == 201, admin.text

    duplicate = client.post(
        "/master/medicines", json=payload, headers=auth_header("manajer")
    )
    assert duplicate.status_code == 409


# ---------------------------------------------------------------------------
# Master data & seeder
# ---------------------------------------------------------------------------
def test_kontrak_master_treatments(client):
    response = client.get("/master/treatments", headers=auth_header("dokter"))
    assert response.status_code == 200
    by_name = {item["name"]: item for item in response.json()}

    assert by_name["Steril Jantan"]["price_type"] == "fixed"
    assert by_name["Steril Jantan"]["price"] == 350000
    assert by_name["Steril Jantan"]["requires_consent"] is True

    assert by_name["Caesar"]["price_type"] == "range"
    assert by_name["Caesar"]["price"] is None
    assert by_name["Caesar"]["price_min"] == 600000
    assert by_name["Caesar"]["price_max"] == 800000

    assert by_name["Tindakan Lainnya"]["price_type"] == "relative"
    assert by_name["Tindakan Lainnya"]["is_relative"] is True


def test_master_medicines_search_dan_nonaktif(client):
    response = client.get(
        "/master/medicines?search=amox", headers=auth_header("dokter")
    )
    assert response.status_code == 200
    results = response.json()
    assert len(results) == 1
    assert results[0]["name"] == "Amoxicillin Vet 250mg"

    medicine_id = results[0]["id"]
    deleted = client.delete(
        f"/master/medicines/{medicine_id}", headers=auth_header("admin")
    )
    assert deleted.status_code == 200

    after = client.get(
        "/master/medicines?search=amox", headers=auth_header("dokter")
    )
    assert after.json() == []


def test_seeder_idempotent(client):
    # Seeder sudah dijalankan fixture; jalankan dua kali lagi.
    seed_module.seed_master_data()
    seed_module.seed_master_data()

    db = main.SessionLocal()
    try:
        assert db.query(main.Treatment).count() == len(seed_module.TREATMENTS)
        assert db.query(main.Medicine).count() == len(seed_module.MEDICINES)

        names = [
            row.name
            for row in db.query(main.Treatment).order_by(main.Treatment.id).all()
        ]
        assert len(names) == len(set(names))

        # Entri seed lama harus nonaktif bila ditemukan.
        db.add(
            main.Treatment(
                name="Operasi Caesar",
                price_min=1,
                price_max=1,
                is_active=True,
            )
        )
        db.commit()
    finally:
        db.close()

    seed_module.seed_master_data()

    db = main.SessionLocal()
    try:
        old = (
            db.query(main.Treatment)
            .filter_by(name="Operasi Caesar")
            .one()
        )
        assert old.is_active is False
        assert db.query(main.Treatment).filter_by(name="Caesar").one().is_active
    finally:
        db.close()
