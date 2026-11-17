<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->decimal('temperature', 4, 1)->nullable()->after('weight'); // Contoh: 38.5
            $table->text('special_marks')->nullable()->after('temperature'); // Ciri khusus
        });
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->dropColumn(['temperature', 'special_marks']);
        });
    }
};
