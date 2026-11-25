<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Membuat master obat yang dipakai untuk resep.
     */
    public function up(): void
    {
        Schema::create('medicines', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
            $table->string('unit', 30); // tablet / ml / botol
            $table->unsignedInteger('stock')->default(0);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Menghapus tabel master obat.
     */
    public function down(): void
    {
        Schema::dropIfExists('medicines');
    }
};
