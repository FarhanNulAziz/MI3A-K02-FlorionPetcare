<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class CreateUser extends Command
{
    protected $signature = 'user:create';

    protected $description = 'Buat akun pengguna baru (password diketik langsung, tidak disimpan di kode)';

    public function handle(): int
    {
        $name = $this->ask('Nama lengkap');
        $email = $this->ask('Email');
        $role = $this->choice('Role', User::ROLES);
        $password = $this->secret('Password (minimal 8 karakter)');
        $confirmation = $this->secret('Ulangi password');

        $validator = Validator::make([
            'name' => $name,
            'email' => $email,
            'role' => $role,
            'password' => $password,
            'password_confirmation' => $confirmation,
        ], [
            'name' => ['required', 'string', 'min:3', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'role' => ['required', Rule::in(User::ROLES)],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        User::create([
            'name' => $name,
            'email' => $email,
            'password' => Hash::make($password),
            'role' => $role,
            'is_active' => true,
        ]);

        $this->info("Akun {$email} ({$role}) berhasil dibuat.");

        return self::SUCCESS;
    }
}
