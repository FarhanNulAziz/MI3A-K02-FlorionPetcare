<?php

namespace Database\Seeders;

use App\Models\Treatment;
use Illuminate\Database\Seeder;

class TreatmentSeeder extends Seeder
{
    /**
     * Master tindakan medis. Aman diulang (updateOrCreate berdasarkan nama).
     */
    public function run(): void
    {
        $treatments = [
            [
                'name' => 'Steril Jantan',
                'price_min' => 350000,
                'price_max' => 350000,
                'is_relative' => false,
                'requires_consent' => true,
                'description' => 'Sterilisasi hewan jantan, tarif tetap dari master.',
            ],
            [
                'name' => 'Steril Betina',
                'price_min' => 550000,
                'price_max' => 550000,
                'is_relative' => false,
                'requires_consent' => true,
                'description' => 'Sterilisasi hewan betina, tarif tetap dari master.',
            ],
            [
                'name' => 'Caesar',
                'price_min' => 600000,
                'price_max' => 800000,
                'is_relative' => false,
                'requires_consent' => true,
                'description' => 'Operasi caesar, tarif ditentukan dokter dalam rentang master.',
            ],
            [
                'name' => 'Cateter',
                'price_min' => 350000,
                'price_max' => 350000,
                'is_relative' => false,
                'requires_consent' => true,
                'description' => 'Pemasangan cateter, tarif tetap dari master.',
            ],
            [
                'name' => 'Cek Jamur',
                'price_min' => 35000,
                'price_max' => 35000,
                'is_relative' => false,
                'requires_consent' => false,
                'description' => 'Pemeriksaan jamur kulit.',
            ],
            [
                'name' => 'Cek Tungau',
                'price_min' => 35000,
                'price_max' => 35000,
                'is_relative' => false,
                'requires_consent' => false,
                'description' => 'Pemeriksaan tungau.',
            ],
            [
                'name' => 'Cek Darah',
                'price_min' => 250000,
                'price_max' => 350000,
                'is_relative' => false,
                'requires_consent' => false,
                'description' => 'Pemeriksaan darah, tarif menyesuaikan jenis tes.',
            ],
            [
                'name' => 'Tindakan Lainnya',
                'price_min' => null,
                'price_max' => null,
                'is_relative' => true,
                'requires_consent' => false,
                'description' => 'Tindakan di luar master; nama dan tarif diisi manual.',
            ],
        ];

        foreach ($treatments as $treatment) {
            Treatment::updateOrCreate(
                ['name' => $treatment['name']],
                $treatment + ['is_active' => true]
            );
        }

        $this->command->info('TreatmentSeeder: ' . count($treatments) . ' tindakan berhasil dibuat.');
    }
}
