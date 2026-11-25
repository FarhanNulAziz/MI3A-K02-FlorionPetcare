<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Treatment extends Model
{
    /**
     * Kolom yang boleh diisi.
     */
    protected $fillable = [
        'name',
        'price_min',
        'price_max',
        'is_relative',
        'requires_consent',
        'description',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'price_min' => 'decimal:2',
            'price_max' => 'decimal:2',
            'is_relative' => 'boolean',
            'requires_consent' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Relasi ke tindakan yang sudah dicatat pada rekam medis.
     */
    public function treatmentItems(): HasMany
    {
        return $this->hasMany(MedicalRecordTreatment::class);
    }
}
