<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Medicine extends Model
{
    /**
     * Kolom yang boleh diisi.
     */
    protected $fillable = [
        'name',
        'unit',
        'stock',
        'description',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'stock' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Relasi ke resep yang memakai obat ini.
     */
    public function prescriptions(): HasMany
    {
        return $this->hasMany(Prescription::class);
    }
}
