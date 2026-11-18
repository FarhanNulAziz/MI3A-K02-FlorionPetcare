<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Membuat master tindakan medis (termasuk tarif & kebutuhan consent).
     */
    public function up(): void
    {
        Schema::create('treatments', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
            $table->decimal('price_min', 12, 2)->nullable();
            $table->decimal('price_max', 12, 2)->nullable();
            $table->boolean('is_relative')->default(false); // tarif ditentukan manual
            $table->boolean('requires_consent')->default(false); // informed consent pemilik
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Menghapus tabel master tindakan.
     */
    public function down(): void
    {
        Schema::dropIfExists('treatments');
    }
};
