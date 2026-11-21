<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Hospitalization extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_id',
        'package_price_per_day',
        'cage_number',
        'admission_date',
        'discharge_date',
        'status',
    ];

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function dailyMonitorings()
    {
        return $this->hasMany(DailyMonitoring::class)->orderBy('monitoring_date', 'desc');
    }
}
