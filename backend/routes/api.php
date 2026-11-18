<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\OwnerController;
use App\Http\Controllers\PatientController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\HospitalizationController;

// Public Routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

// Protected Routes
Route::middleware('auth:api')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
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

    // Kelola Rawat Inap & Daily Monitoring (Hanya staf klinik, Pemilik tidak bisa akses)
    Route::middleware('role:admin,manajer,dokter,paramedik')->prefix('hospitalizations')->group(function () {
        Route::get('/', [HospitalizationController::class, 'index']);
        Route::post('/', [HospitalizationController::class, 'store']);
        Route::get('/{id}', [HospitalizationController::class, 'show']);
        Route::post('/{id}/monitorings', [HospitalizationController::class, 'storeMonitoring']);
        Route::patch('/{id}/discharge', [HospitalizationController::class, 'discharge']);
    });
});
