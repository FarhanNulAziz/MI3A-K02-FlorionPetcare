<?php

namespace Database\Seeders;

use App\Models\Service;
use Illuminate\Database\Seeder;

class ServiceSeeder extends Seeder
{
    public function run(): void
    {
        $services = [
            // Harga 0 berarti Relatif
            ['name' => 'Pengobatan', 'price' => 0, 'description' => 'Biaya relatif tergantung jenis obat'],
            ['name' => 'Rawat Inap (Paket 35.000)', 'price' => 35000, 'description' => 'Paket rawat inap dasar'],
            ['name' => 'Rawat Inap (Paket 50.000)', 'price' => 50000, 'description' => 'Paket rawat inap premium'],
            ['name' => 'Petshop', 'price' => 0, 'description' => 'Harga relatif tergantung produk'],

            ['name' => 'Grooming - Mandi Sehat', 'price' => 50000, 'description' => 'Mandi dan perawatan standar'],
            ['name' => 'Grooming - Sehat Premium', 'price' => 70000, 'description' => 'Mandi dan perawatan premium'],
            ['name' => 'Grooming - Mandi Jamur', 'price' => 70000, 'description' => 'Penanganan khusus jamur'],
            ['name' => 'Grooming - Mandi Kutu', 'price' => 70000, 'description' => 'Penanganan khusus kutu'],
            ['name' => 'Grooming - Mandi Lengkap', 'price' => 90000, 'description' => 'Mandi, potong kuku, bersih telinga'],

            ['name' => 'Vaksinasi', 'price' => 280000, 'description' => 'Vaksinasi rutin hewan'],
            ['name' => 'Operasi Minor', 'price' => 0, 'description' => 'Biaya relatif tergantung jenis operasi'],
            ['name' => 'Laboratorium', 'price' => 0, 'description' => 'Biaya relatif tergantung pemeriksaan'],
        ];

        foreach ($services as $service) {
            Service::updateOrCreate(
                ['name' => $service['name']],
                $service
            );
        }

        $this->command->info('ServiceSeeder: ' . count($services) . ' layanan berhasil dibuat.');
    }
}
