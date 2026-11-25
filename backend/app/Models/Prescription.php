<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Prescription extends Model
{
    /**
     * Kolom yang boleh diisi.
     */
    protected $fillable = [
        'medical_record_id',
        'medicine_id',
        'quantity',
        'dosage',
        'frequency',
        'duration_days',
        'must_finish',
        'instructions',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'duration_days' => 'integer',
            'must_finish' => 'boolean',
        ];
    }

    /**
     * Relasi ke obat yang diresepkan.
     */
    public function medicine(): BelongsTo
    {
        return $this->belongsTo(Medicine::class);
    }

    /**
     * Relasi ke rekam medis pemilik resep.
     */
    public function medicalRecord(): BelongsTo
    {
        return $this->belongsTo(MedicalRecord::class);
    }
}
