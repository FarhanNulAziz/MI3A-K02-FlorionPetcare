<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Menyesuaikan daftar role di MySQL.
     *
     * SQLite menyimpan role sebagai VARCHAR sehingga tidak perlu diubah;
     * validasi nilai role tetap dilakukan di lapisan aplikasi (User::ROLES / CheckRole).
     */
    public function up(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'manajer', 'dokter', 'paramedik', 'pemilik') DEFAULT 'pemilik'");
    }

    /**
     * Mengembalikan daftar role lama di MySQL.
     */
    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'manajer', 'dokter', 'paramedik') DEFAULT 'paramedik'");
    }
};
