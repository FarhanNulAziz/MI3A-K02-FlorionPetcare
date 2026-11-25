<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Satu baris = satu obat pada satu rekam medis.
     */
    public function up(): void
    {
        Schema::create('prescriptions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('medical_record_id')
                ->constrained('medical_records')
                ->restrictOnDelete();

            $table->foreignId('medicine_id')
                ->constrained('medicines')
                ->restrictOnDelete();

            $table->unsignedInteger('quantity');
            $table->string('dosage');
            $table->string('frequency'); // contoh: 3x sehari
            $table->unsignedInteger('duration_days')->nullable();
            $table->boolean('must_finish')->default(false); // wajib dihabiskan
            $table->text('instructions')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Menghapus tabel resep.
     */
    public function down(): void
    {
        Schema::dropIfExists('prescriptions');
    }
};
