<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Membuat tabel medical_records
     * untuk menyimpan riwayat pemeriksaan medis pasien (SOAP).
     */
    public function up(): void
    {
        Schema::create('medical_records', function (Blueprint $table) {
            // Primary Key
            $table->id();

            // Relasi ke tabel patients
            $table->foreignId('patient_id')
                ->constrained('patients')
                ->restrictOnDelete();

            // Relasi ke tabel users (dokter/paramedik pencatat)
            $table->foreignId('user_id')
                ->constrained('users')
                ->restrictOnDelete();

            // Komponen SOAP
            $table->text('subjective')->nullable();
            $table->text('objective')->nullable();
            $table->text('assessment')->nullable();
            $table->text('plan')->nullable();

            // Waktu pembuatan dan pembaruan data
            $table->timestamps();
        });
    }

    /**
     * Menghapus tabel medical_records.
     */
    public function down(): void
    {
        Schema::dropIfExists('medical_records');
    }
};
