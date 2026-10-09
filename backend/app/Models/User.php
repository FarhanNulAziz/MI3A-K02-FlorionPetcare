<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Tymon\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    use HasFactory, Notifiable;

    public const ROLE_ADMIN = 'admin';
    public const ROLE_PARAMEDIK = 'paramedik';
    public const ROLE_DOKTER = 'dokter';
    public const ROLE_MANAJER = 'manajer';

    public const ROLES = [
        self::ROLE_ADMIN,
        self::ROLE_PARAMEDIK,
        self::ROLE_DOKTER,
        self::ROLE_MANAJER,
    ];

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'is_active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    public function hasRole(string ...$roles): bool
    {
        return in_array($this->role, $roles, true);
    }

    /**
     * Menu bottom-tab sesuai role (dokumen Sprint 1, bagian 1.3).
     * "available" = false berarti fiturnya baru hadir di sprint berikutnya.
     */
    public function menus(): array
    {
        $menu = fn (string $key, string $label, bool $available = true) => [
            'key' => $key,
            'label' => $label,
            'available' => $available,
        ];

        return match ($this->role) {
            self::ROLE_ADMIN, self::ROLE_PARAMEDIK => [
                $menu('beranda', 'Beranda'),
                $menu('pemilik', 'Pemilik'),
                $menu('pasien', 'Pasien'),
                $menu('layanan', 'Layanan'),
                $menu('profil', 'Profil'),
            ],
            self::ROLE_DOKTER => [
                $menu('beranda', 'Beranda'),
                $menu('pasien', 'Pasien'),
                $menu('riwayat', 'Riwayat', false), // Sprint 2
                $menu('profil', 'Profil'),
            ],
            self::ROLE_MANAJER => [
                $menu('beranda', 'Beranda'),
                $menu('laporan', 'Laporan', false), // Sprint 3
                $menu('profil', 'Profil'),
            ],
            default => [],
        };
    }

    // Dua fungsi wajib JWTSubject
    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims()
    {
        return [
            'role' => $this->role, // role ikut tersimpan di dalam token JWT
        ];
    }
}
