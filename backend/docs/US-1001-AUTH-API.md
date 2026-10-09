# US-1001 — Login & Hak Akses (API)

Base URL: `http://<host>:8000/api` — semua request kirim header `Accept: application/json`.
Endpoint terlindungi: `Authorization: Bearer <access_token>`.

## Akun contoh (hasil `php artisan db:seed --class=UserSeeder`)
| Email | Password | Role |
|---|---|---|
| admin@florion.com | password123 | admin |
| paramedik@florion.com | password123 | paramedik |
| dokter@florion.com | password123 | dokter |
| manajer@florion.com | password123 | manajer |

## Endpoint
| Method | URL | Auth | Keterangan |
|---|---|---|---|
| POST | /login | - | Login, maksimal 5x/menit per email+IP |
| GET | /me | Bearer | Cek token & ambil data user (untuk Splash Screen) |
| POST | /logout | Bearer | Mematikan token (blacklist) |
| POST | /refresh | Bearer | Tukar token dengan token baru |

### POST /login
Body: `{ "email": "dokter@florion.com", "password": "password123" }`

200 OK:
```json
{
  "success": true,
  "message": "Login berhasil",
  "user": { "id": 3, "name": "Drh. Budiman", "email": "dokter@florion.com", "role": "dokter" },
  "menus": [
    { "key": "beranda", "label": "Beranda", "available": true },
    { "key": "pasien",  "label": "Pasien",  "available": true },
    { "key": "riwayat", "label": "Riwayat", "available": false },
    { "key": "profil",  "label": "Profil",  "available": true }
  ],
  "access_token": "eyJ0eXAiOiJKV1Qi...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

| Status | Kapan | message |
|---|---|---|
| 422 | Field kosong / format email salah | "Email wajib diisi" / "Password wajib diisi" / "Format email salah" (detail per field di `errors`) |
| 401 | Email atau password salah | "Email atau password salah" |
| 403 | Akun `is_active = false` | "Akun Anda tidak aktif. Hubungi admin." |
| 429 | Terlalu banyak percobaan | "Terlalu banyak percobaan login. Coba lagi dalam satu menit." |

### Menu per role
| Role | Menu |
|---|---|
| admin, paramedik | Beranda, Pemilik, Pasien, Layanan, Profil |
| dokter | Beranda, Pasien, Riwayat (Sprint 2, `available:false`), Profil |
| manajer | Beranda, Laporan (Sprint 3, `available:false`), Profil |

### Respons error di endpoint terlindungi
- 401 — token tidak ada / salah / kedaluwarsa / sudah logout → mobile hapus token & arahkan ke Login.
- 403 — role tidak diizinkan: "Anda tidak memiliki hak akses untuk fitur ini."

## Cara memakai pembatas role di US lain (untuk anggota tim)
```php
// routes/api.php, di dalam group Route::middleware('auth:api')
Route::middleware('role:admin,paramedik')->group(function () {
    Route::apiResource('owners', OwnerController::class);
});
```
Di controller, user login: `auth('api')->user()` atau `$request->user()`; cek role: `$user->hasRole('admin')`.
Konstanta role: `User::ROLE_ADMIN`, `ROLE_PARAMEDIK`, `ROLE_DOKTER`, `ROLE_MANAJER`.

## Setelah menarik perubahan ini
```bash
php artisan migrate                       # menambah kolom role & is_active (tidak menghapus data)
php artisan db:seed --class=UserSeeder    # akun contoh (aman diulang)
php artisan test                          # 17 test auth
```
Syarat: PHP 8.4+ (mengikuti composer.lock).
