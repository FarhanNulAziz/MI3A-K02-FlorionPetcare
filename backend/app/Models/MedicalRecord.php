<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

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
        'temperature',
    ];

    /**
     * Tipe data kolom.
     */
    protected function casts(): array
    {
        return [
            'temperature' => 'decimal:1',
        ];
    }

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

    /**
     * Relasi ke resep obat pada rekam medis ini.
     */
    public function prescriptions(): HasMany
    {
        return $this->hasMany(Prescription::class);
    }

    /**
     * Relasi ke tindakan pada rekam medis ini.
     *
     * Memakai model pivot karena setiap baris punya tarif, consent, dan custom_name sendiri.
     */
    public function treatmentItems(): HasMany
    {
        return $this->hasMany(MedicalRecordTreatment::class);
    }
}
