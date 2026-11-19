
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hospitalizations', function (Blueprint $table) {
            $table->id();

            $table->foreignId('patient_id')
                ->constrained('patients')
                ->restrictOnDelete();

            $table->unsignedInteger('package_price_per_day');

            $table->string('cage_number');

            $table->date('admission_date');
            $table->date('discharge_date')->nullable();

            $table->enum('status', ['inpatient', 'discharged'])
                ->default('inpatient');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hospitalizations');
    }
};
