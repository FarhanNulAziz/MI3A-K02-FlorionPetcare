<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Patient extends Model
{
    protected $table = 'patients';

    protected $fillable = [
        'name',
        'species',
        'breed',
        'age',
        'weight',
        'owner_id',
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
}
