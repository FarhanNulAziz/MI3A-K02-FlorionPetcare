<?php

namespace Database\Seeders;

use App\Models\Service;
use Illuminate\Database\Seeder;

class ServiceSeeder extends Seeder
{
    public function run(): void
    {
        $services = [
            ['name' => 'Konsultasi',        'price' => 50000,  'description' => 'Pemeriksaan umum oleh dokter hewan'],
            ['name' => 'Vaksinasi',         'price' => 150000, 'description' => 'Vaksinasi rutin hewan'],
            ['name' => 'Grooming',          'price' => 100000, 'description' => 'Perawatan dan pembersihan hewan'],
            ['name' => 'Operasi Kecil',     'price' => 500000, 'description' => 'Tindakan operasi ringan'],
            ['name' => 'Rawat Inap / Hari', 'price' => 200000, 'description' => 'Biaya rawat inap per hari'],
            ['name' => 'Pemeriksaan Lab',   'price' => 120000, 'description' => 'Pemeriksaan laboratorium'],
        ];

        foreach ($services as $service) {
            Service::create($service);
        }
    }
}
