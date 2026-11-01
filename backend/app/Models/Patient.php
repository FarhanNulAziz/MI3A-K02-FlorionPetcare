<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

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

    public function owner()
    {
        return $this->belongsTo(Owner::class);
    }
}
