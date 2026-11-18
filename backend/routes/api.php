<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\MedicineController;
use App\Http\Controllers\OwnerController;
use App\Http\Controllers\PatientController;
use App\Http\Controllers\PrescriptionController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\TreatmentController;

// Public Routes
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::post('/register', [AuthController::class, 'register']);

// Protected Routes
Route::middleware('auth:api')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/refresh', [AuthController::class, 'refresh']);
    Route::get('/me', [AuthController::class, 'me']);

    // Semua role bisa akses Pasien (Backend akan memfilter datanya)
    Route::middleware('role:admin,manajer,dokter,paramedik,pemilik')->group(function () {
        Route::apiResource('patients', PatientController::class);
    });

    // Hanya Admin & Paramedik yang bisa kelola Pemilik
    Route::middleware('role:admin,manajer,paramedik')->group(function () {
        Route::apiResource('owners', OwnerController::class);
    });

    // Hanya Admin & Manajer yang bisa kelola Layanan
    Route::middleware('role:admin,manajer')->group(function () {
        Route::apiResource('services', ServiceController::class);
    });

    // Riwayat medis hanya untuk Dokter dan Paramedik
    Route::middleware('role:dokter,paramedik')->group(function () {
        Route::get(
            '/patients/{patient}/medical-records',
            [PatientController::class, 'medicalRecords']
        );
    });

    // Master obat & tindakan untuk dropdown FE
    Route::middleware('role:admin,dokter,paramedik')->group(function () {
        Route::get('/medicines', [MedicineController::class, 'index']);
        Route::get('/treatments', [TreatmentController::class, 'index']);
    });

    // Kelola master obat & stok
    Route::middleware('role:admin,manajer')->group(function () {
        Route::post('/medicines', [MedicineController::class, 'store']);
        Route::put('/medicines/{medicine}', [MedicineController::class, 'update']);
        Route::delete('/medicines/{medicine}', [MedicineController::class, 'destroy']);
    });

    // Resep & tindakan: bisa dibaca oleh dokter dan paramedik
    Route::middleware('role:dokter,paramedik')->group(function () {
        Route::get(
            '/medical-records/{medicalRecord}/prescriptions',
            [PrescriptionController::class, 'index']
        );
    });

    // Resep & tindakan: penulisan hanya dokter
    Route::middleware('role:dokter')->group(function () {
        Route::post(
            '/medical-records/{medicalRecord}/prescriptions',
            [PrescriptionController::class, 'store']
        );
        Route::put('/prescriptions/{prescription}', [PrescriptionController::class, 'update']);
        Route::delete('/prescriptions/{prescription}', [PrescriptionController::class, 'destroy']);
        Route::delete(
            '/medical-record-treatments/{medicalRecordTreatment}',
            [PrescriptionController::class, 'destroyTreatment']
        );
    });
});
