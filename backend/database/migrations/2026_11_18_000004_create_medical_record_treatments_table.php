<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tindakan pada rekam medis (pivot dengan data tambahan).
     */
    public function up(): void
    {
        Schema::create('medical_record_treatments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('medical_record_id')
                ->constrained('medical_records')
                ->restrictOnDelete();

            $table->foreignId('treatment_id')
                ->constrained('treatments')
                ->restrictOnDelete();

            $table->string('custom_name', 150)->nullable(); // untuk Tindakan Lainnya
            $table->decimal('price', 12, 2); // tarif yang benar-benar dikenakan

            $table->boolean('consent_given')->default(false);
            $table->string('consent_by', 150)->nullable();
            $table->timestamp('consent_at')->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Menghapus tabel pivot tindakan.
     */
    public function down(): void
    {
        Schema::dropIfExists('medical_record_treatments');
    }
};
