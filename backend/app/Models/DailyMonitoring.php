<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DailyMonitoring extends Model
{
    use HasFactory;

    protected $fillable = [
        'hospitalization_id',
        'monitoring_date',
        'appetite',
        'pip',
        'pup',
        'vomiting',
        'diarrhea',
        'notes',
    ];

    protected $casts = [
        'vomiting' => 'boolean',
        'diarrhea' => 'boolean',
    ];

    public function hospitalization()
    {
        return $this->belongsTo(Hospitalization::class);
    }
}
