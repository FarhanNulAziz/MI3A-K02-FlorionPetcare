<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MedicalRecordTreatment extends Model
{
    /**
     * Kolom yang boleh diisi.
     */
    protected $fillable = [
        'medical_record_id',
        'treatment_id',
        'custom_name',
        'price',
        'consent_given',
        'consent_by',
        'consent_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'consent_given' => 'boolean',
            'consent_at' => 'datetime',
        ];
    }

    /**
     * Relasi ke master tindakan.
     */
    public function treatment(): BelongsTo
    {
        return $this->belongsTo(Treatment::class);
    }

    /**
     * Relasi ke rekam medis.
     */
    public function medicalRecord(): BelongsTo
    {
        return $this->belongsTo(MedicalRecord::class);
    }
}
