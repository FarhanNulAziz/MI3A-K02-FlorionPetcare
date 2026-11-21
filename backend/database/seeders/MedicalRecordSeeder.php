<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Patient;
use App\Models\User;
use App\Models\MedicalRecord;

class MedicalRecordSeeder extends Seeder
{
    public function run(): void
    {
        // Pastikan pasien ID tersedia
        $patient = Patient::find(6);

        // Pastikan dokter ID tersedia
        $doctor = User::find(6);

        if (!$patient || !$doctor) {
            $this->command->error('Pasien atau dokter tidak ditemukan.');
            return;
        }

        MedicalRecord::updateOrCreate(
            [
                'patient_id' => $patient->id,
                'user_id' => $doctor->id,
            ],
            [
                'subjective' => 'Pasien mengalami penurunan nafsu makan.',
                'objective' => 'Suhu tubuh 38.5 derajat Celsius.',
                'assessment' => 'Diduga mengalami gangguan pencernaan.',
                'plan' => 'Pemberian obat dan pemantauan kondisi pasien.',
                'temperature' => 38.5,
            ]
        );

        $this->command->info('Riwayat medis berhasil ditambahkan.');
    }
}
