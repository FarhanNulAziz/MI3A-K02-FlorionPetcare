<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MedicalRecord extends Model
{
    /**
     * Kolom yang boleh diisi.
     */
    protected $fillable = [
        'patient_id',
        'user_id',
        'subjective',
        'objective',
        'assessment',
        'plan',
    ];

    /**
     * Relasi ke pasien.
     */
    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    /**
     * Relasi ke user yang mencatat rekam medis.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
