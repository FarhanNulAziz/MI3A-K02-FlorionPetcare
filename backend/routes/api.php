<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\OwnerController;
use App\Http\Controllers\PatientController;
use App\Http\Controllers\ServiceController;

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
});
