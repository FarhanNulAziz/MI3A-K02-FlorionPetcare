<?php

namespace Database\Seeders;

use App\Models\Medicine;
use Illuminate\Database\Seeder;

class MedicineSeeder extends Seeder
{
    /**
     * Master obat hewan. Aman diulang (updateOrCreate berdasarkan nama).
     */
    public function run(): void
    {
        $medicines = [
            ['name' => 'Amoxicillin 500 mg', 'unit' => 'tablet', 'stock' => 120, 'description' => 'Antibiotik umum untuk infeksi bakteri.'],
            ['name' => 'Cefixime 100 mg', 'unit' => 'tablet', 'stock' => 80, 'description' => 'Antibiotik untuk infeksi saluran pencernaan.'],
            ['name' => 'Vitamin B Complex', 'unit' => 'tablet', 'stock' => 150, 'description' => 'Suplemen vitamin untuk nafsu makan dan stamina.'],
            ['name' => 'Antiparasit', 'unit' => 'ml', 'stock' => 90, 'description' => 'Obat cacing dan parasit internal.'],
            ['name' => 'Salep Kulit', 'unit' => 'botol', 'stock' => 60, 'description' => 'Salep untuk iritasi dan luka kulit ringan.'],
            ['name' => 'Metronidazol', 'unit' => 'tablet', 'stock' => 100, 'description' => 'Antibiotik untuk infeksi anaerob dan protozoa.'],
            ['name' => 'Enrofloxacin', 'unit' => 'ml', 'stock' => 70, 'description' => 'Antibiotik injeksi untuk infeksi bakteri.'],
            ['name' => 'Vitamin C', 'unit' => 'tablet', 'stock' => 180, 'description' => 'Suplemen daya tahan tubuh.'],
            ['name' => 'Obat Kutu', 'unit' => 'botol', 'stock' => 110, 'description' => 'Obat kutu dan pinjal untuk anjing dan kucing.'],
            ['name' => 'Probiotik', 'unit' => 'botol', 'stock' => 50, 'description' => 'Menjaga kesehatan flora usus.'],
        ];

        foreach ($medicines as $medicine) {
            Medicine::updateOrCreate(
                ['name' => $medicine['name']],
                $medicine + ['is_active' => true]
            );
        }

        $this->command->info('MedicineSeeder: ' . count($medicines) . ' obat berhasil dibuat.');
    }
}
