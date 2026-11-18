
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daily_monitorings', function (Blueprint $table) {
            $table->id();

            $table->foreignId('hospitalization_id')
                ->constrained('hospitalizations')
                ->cascadeOnDelete();

            $table->date('monitoring_date');

            $table->string('appetite')->nullable();
            $table->text('pip')->nullable();
            $table->text('pup')->nullable();

            $table->boolean('vomiting')->default(false);
            $table->boolean('diarrhea')->default(false);

            $table->text('notes')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_monitorings');
    }
};
