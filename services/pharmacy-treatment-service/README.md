# Pharmacy & Treatment Service (US-2003)

Microservice FastAPI untuk master obat, master tindakan, serta penyimpanan
resep dan tindakan medis Florion Petcare. Database: `florion_pharmacy`.

Entry point tetap `main:app` (Docker memakai `uvicorn main:app`).

## Struktur file

| File | Isi |
| --- | --- |
| `main.py` | Aplikasi FastAPI dan seluruh endpoint |
| `database.py` | Engine, session, pembuatan database MySQL, dukungan SQLite untuk test |
| `models.py` | Model SQLAlchemy |
| `schemas.py` | Skema Pydantic (validasi tipe/format) |
| `auth.py` | Dependency JWT (`get_current_user`, `require_roles`) |
| `seed.py` | Seeder idempotent master obat & tindakan |
| `tests/test_prescriptions.py` | Test pytest (SQLite in-memory, mock EMR) |

## Menjalankan

```bash
docker compose up --build
```

Service berjalan di belakang gateway pada prefix `/api/pharmacy/`.
Contoh: `GET http://localhost:8080/api/pharmacy/master/medicines`.

### Environment

| Variable | Default | Keterangan |
| --- | --- | --- |
| `DATABASE_URL` | `mysql+pymysql://root:root@db:3306/florion_pharmacy` | Koneksi database |
| `JWT_SECRET` | `florion_secret_key` | Harus sama dengan `JWT_SECRET` Laravel |
| `EMR_SERVICE_URL` | `http://emr-service:8000` | Basis URL EMR service |

## Autentikasi & role

Semua endpoint memerlukan header `Authorization: Bearer <jwt>`.
JWT di-decode dengan `HS256` memakai `JWT_SECRET`. Payload yang dipakai:
`role`, `sub` (id dokter), dan `name` (nama dokter).

| Aksi | Role yang diizinkan |
| --- | --- |
| `GET /master/medicines`, `GET /master/treatments` | `admin`, `dokter`, `paramedik` |
| `GET /prescriptions`, `GET /prescriptions/{id}` | `admin`, `dokter`, `paramedik` |
| `POST /prescriptions`, `DELETE /prescriptions/{id}` | `dokter` |
| `POST/PUT/DELETE /master/medicines` | `admin`, `manajer` |
| Role lain (`pemilik`, dll.) | 403 |
| Tanpa token / token tidak sah | 401 |

`doctor_id` dan `doctor_name` pada resep diambil dari JWT (`sub`, `name`),
bukan dari body request.

## Endpoint

### Master obat

- `GET /master/medicines?search=` — hanya `is_active = true`, urut nama.
- `POST /master/medicines` — tambah obat.
- `PUT /master/medicines/{id}` — ubah obat.
- `DELETE /master/medicines/{id}` — nonaktifkan (`is_active = false`), bukan hapus.

Contoh respons `GET /master/medicines`:

```json
[
  {
    "id": 1,
    "name": "Amoxicillin Vet 250mg",
    "unit": "Tablet",
    "stock": 120,
    "price": 5000,
    "description": "Antibiotik umum untuk infeksi bakteri.",
    "is_active": true
  }
]
```

Contoh body `POST /master/medicines`:

```json
{
  "name": "Cefixime",
  "unit": "Tablet",
  "stock": 80,
  "price": 8000,
  "description": "Antibiotik untuk infeksi saluran pencernaan."
}
```

Validasi: nama unik, `stock >= 0`, `price >= 0`.

### Master tindakan

`GET /master/treatments` — hanya tindakan aktif. Bentuk item:

```json
{
  "id": 1,
  "name": "Steril Jantan",
  "price_min": 350000,
  "price_max": 350000,
  "price": 350000,
  "price_type": "fixed",
  "is_relative": false,
  "requires_consent": true
}
```

`price_type`:

- `fixed` — `price_min == price_max`, bukan relatif. `price` = `price_min`.
- `range` — tarif berada di antara `price_min` dan `price_max`. `price` = null.
- `relative` — tindakan di luar daftar (`Tindakan Lainnya`). `price` = null.

### Resep & tindakan medis

`POST /prescriptions` (201):

```json
{
  "medical_record_id": 1,
  "patient_id": 2,
  "notes": "opsional, maks 255",
  "medicines": [
    {
      "medicine_id": 1,
      "quantity": 10,
      "dosage_rule": "3x1 sesudah makan",
      "must_finish": true
    }
  ],
  "treatments": [
    { "treatment_id": 1, "consent_given": true, "consent_by": "Budi Santoso" },
    { "treatment_id": 3, "price": 700000, "consent_given": true, "consent_by": "Budi Santoso" },
    { "treatment_id": 8, "custom_name": "Perawatan luka", "price": 75000 }
  ]
}
```

Respons 201:

```json
{
  "message": "Resep & tindakan medis tersimpan, stok obat telah diperbarui",
  "prescription_id": 5,
  "data": {
    "id": 5,
    "medical_record_id": 1,
    "patient_id": 2,
    "doctor_id": 3,
    "doctor_name": "drh. ...",
    "notes": null,
    "created_at": "2026-11-21T10:00:00",
    "medicines": [
      {
        "id": 1,
        "medicine_id": 1,
        "medicine_name": "Amoxicillin Vet 250mg",
        "unit": "Tablet",
        "quantity": 10,
        "dosage_rule": "3x1 sesudah makan",
        "must_finish": true,
        "unit_price": 5000
      }
    ],
    "treatments": [
      {
        "id": 1,
        "treatment_id": 1,
        "treatment_name": "Steril Jantan",
        "custom_name": null,
        "price": 350000,
        "requires_consent": true,
        "consent_given": true,
        "consent_by": "Budi Santoso",
        "consent_at": "2026-11-21T10:00:00",
        "notes": null
      }
    ],
    "total": 400000
  }
}
```

`total` = `sum(unit_price x quantity)` + `sum(price tindakan)`.

- `GET /prescriptions?medical_record_id=&patient_id=` — minimal satu filter
  wajib (jika tidak, 422). Urut terbaru dulu.
  Respons: `{ "total": <jumlah resep>, "data": [ ... ] }`.
- `GET /prescriptions/{id}` — `{ "data": { ... } }`, 404 bila tidak ada.
- `DELETE /prescriptions/{id}` — hanya dokter. Stok obat dikembalikan dalam
  satu transaksi.

## Tabel tarif tindakan

| Tindakan | Tipe | Tarif | Wajib consent |
| --- | --- | --- | --- |
| Steril Jantan | tetap | 350.000 | ya |
| Steril Betina | tetap | 550.000 | ya |
| Caesar | rentang | 600.000 – 800.000 | ya |
| Cateter | tetap | 350.000 | ya |
| Cek Jamur | tetap | 35.000 | tidak |
| Cek Tungau | tetap | 35.000 | tidak |
| Cek Darah | rentang | 250.000 – 350.000 | tidak |
| Tindakan Lainnya | relatif | diisi manual | tidak |

## Aturan bisnis

### Stok obat

- Resep minimal berisi satu obat atau satu tindakan.
- `medicine_id` harus ada dan aktif. `quantity >= 1`, `dosage_rule` minimal
  3 karakter, dan obat yang sama tidak boleh dipilih dua kali.
- Seluruh proses berjalan dalam satu transaksi. Baris obat dibaca dengan
  `with_for_update()`.
- Jika stok kurang, seluruh resep di-rollback dan dibalas 409:
  `"Stok {nama} tidak mencukupi (sisa: {n})"`.
- Stok berkurang saat resep disimpan dan dikembalikan saat resep dihapus.
- Stok tidak boleh negatif (CHECK constraint `stock >= 0`).

### Tindakan

- `treatment_id` harus ada dan aktif.
- **Tetap**: `price` boleh kosong (otomatis dari master). Jika dikirim, harus
  sama dengan tarif master.
- **Rentang**: `price` wajib dan harus berada di antara `price_min` dan
  `price_max` (inklusif).
- **Relatif** (`Tindakan Lainnya`): `custom_name` wajib (maks 150) dan `price`
  wajib `>= 0`. Boleh muncul lebih dari sekali dengan `custom_name` berbeda.
- Tindakan non-relatif yang sama tidak boleh muncul dua kali dalam satu resep.
- `custom_name` pada tindakan non-relatif diabaikan.

### Informed consent

- Consent berupa centang/persetujuan lisan pemilik hewan, bukan upload dokumen.
- Jika `requires_consent = true`, `consent_given` wajib `true` dan
  `consent_by` wajib terisi. Jika tidak:
  422 `"Tindakan {nama} memerlukan persetujuan pemilik hewan"`.
- `consent_at` selalu diisi server saat consent diberikan; nilai dari client
  diabaikan.
- Untuk tindakan yang tidak mewajibkan consent, consent bersifat opsional.

### Validasi rekam medis

Sebelum menyimpan, service memanggil EMR:

```text
GET {EMR_SERVICE_URL}/patients/{patient_id}/medical-records
```

dengan header `Authorization` yang sama (timeout 5 detik). `medical_record_id`
harus ada di `timeline`.

- Tidak ada di timeline: 404 `"Rekam medis tidak ditemukan untuk pasien ini"`.
- EMR tidak terjangkau: 503 `"Layanan rekam medis tidak tersedia"`.

## Perubahan skema & database dev

`Base.metadata.create_all` **tidak** mengubah tabel yang sudah ada. Setelah
perubahan skema, drop database dev lalu restart service:

```bash
docker compose exec db mysql -uroot -proot -e "DROP DATABASE florion_pharmacy"
docker compose restart pharmacy-treatment-service
```

Data dev aman dibuang. Service akan membuat ulang database, tabel, dan seeder
saat start.

## Menjalankan test

```bash
cd services/pharmacy-treatment-service
pip install -r requirements-dev.txt
pytest
```

Test memakai SQLite in-memory (`DATABASE_URL=sqlite://`) dan mem-mock HTTP ke
EMR service. Tidak memerlukan MySQL atau container EMR.

## Contoh curl lewat gateway

Login untuk mendapatkan token (akun seeder Laravel):

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dokter@florion.test","password":"dokter123"}' \
  | jq -r '.access_token')

echo "$TOKEN"
```

Master obat & tindakan:

```bash
curl -s http://localhost:8080/api/pharmacy/master/medicines \
  -H "Authorization: Bearer $TOKEN"

curl -s http://localhost:8080/api/pharmacy/master/treatments \
  -H "Authorization: Bearer $TOKEN"
```

Simpan resep:

```bash
curl -s -X POST http://localhost:8080/api/pharmacy/prescriptions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "medical_record_id": 1,
    "patient_id": 2,
    "notes": "kontrol rutin",
    "medicines": [
      {
        "medicine_id": 1,
        "quantity": 10,
        "dosage_rule": "3x1 sesudah makan",
        "must_finish": true
      }
    ],
    "treatments": [
      {
        "treatment_id": 1,
        "consent_given": true,
        "consent_by": "Budi Santoso"
      }
    ]
  }'
```

Ambil resep:

```bash
curl -s "http://localhost:8080/api/pharmacy/prescriptions?medical_record_id=1" \
  -H "Authorization: Bearer $TOKEN"
```

Hapus resep (stok dikembalikan):

```bash
curl -s -X DELETE http://localhost:8080/api/pharmacy/prescriptions/1 \
  -H "Authorization: Bearer $TOKEN"
```

## Catatan integrasi

- `JWT_SECRET` di service ini **harus sama** dengan `JWT_SECRET` Laravel.
  `docker-compose.yml` memakai `florion_secret_key`, sedangkan `backend/.env`
  bisa berisi nilai lain. Samakan sebelum mencoba lewat gateway.
- Laravel saat ini hanya menambahkan custom claim `role` pada JWT. Claim `name`
  belum dikirim, sehingga `doctor_name` akan jatuh ke `"Dokter Klinik"` sampai
  `getJWTCustomClaims()` di backend juga mengirim `name`.
