<?php

namespace Database\Seeders;

use App\Models\Patient;
use Illuminate\Database\Seeder;

class PatientSeeder extends Seeder
{
    public function run(): void
    {
        Patient::create([
            'name' => 'Milo',
            'species' => 'Kucing',
            'breed' => 'Persia',
            'age' => 2,
            'weight' => 4.50,
            'owner_id' => 2,
            'notes' => 'Pasien uji untuk pemeriksaan medis.',
        ]);
    }
}
