<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $accounts = [
            ['Admin Florion', 'admin@florion.test', 'admin123', User::ROLE_ADMIN],
            ['Paramedik', 'paramedik@florion.test', 'paramedik123', User::ROLE_PARAMEDIK],
            ['Dokter', 'dokter@florion.test', 'dokter123', User::ROLE_DOKTER],
            ['Manajer', 'manajer@florion.test', 'manajer123', User::ROLE_MANAJER],
        ];

        foreach ($accounts as [$name, $email, $password, $role]) {
            User::updateOrCreate(
                ['email' => $email],
                [
                    'name' => $name,
                    'password' => Hash::make($password),
                    'role' => $role,
                    'is_active' => true,
                ]
            );
        }
    }
}
