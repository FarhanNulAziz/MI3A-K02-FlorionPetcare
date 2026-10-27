<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
{
    DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'manajer', 'dokter', 'paramedik', 'pemilik') DEFAULT 'pemilik'");
}

public function down()
{
    DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'manajer', 'dokter', 'paramedik') DEFAULT 'paramedik'");
}
};
