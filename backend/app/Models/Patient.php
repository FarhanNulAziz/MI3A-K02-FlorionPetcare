<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Patient extends Model
{
    protected $fillable = [
        'owner_id',
        'name',
        'species',
        'breed',
        'gender',
        'age',
        'weight',
        'temperature',
        'special_marks',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'age' => 'integer',
            'weight' => 'decimal:2',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(Owner::class);
    }

    // Relasi pasien dengan riwayat pemeriksaan medis
    public function medicalRecords(): HasMany
    {
        return $this->hasMany(MedicalRecord::class);
    }

    // Relasi pasien dengan riwayat rawat inap
    public function hospitalizations(): HasMany
    {
        return $this->hasMany(Hospitalization::class);
    }
}
