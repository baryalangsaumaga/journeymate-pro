<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransitConnection extends Model
{
    use HasFactory;

    protected $fillable = [
        'from_stop_id',
        'to_stop_id',
        'mode',
        'route_name',
        'provider',
        'fare',
        'duration_minutes',
        'distance_meters',
        'instructions',
        'path_coordinates',
        'is_bidirectional',
        'operating_hours',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'from_stop_id' => 'integer',
            'to_stop_id' => 'integer',
            'fare' => 'float',
            'duration_minutes' => 'integer',
            'distance_meters' => 'integer',
            'path_coordinates' => 'array',
            'is_bidirectional' => 'boolean',
        ];
    }

    /**
     * The stop this connection departs FROM.
     */
    public function fromStop(): BelongsTo
    {
        return $this->belongsTo(TransitStop::class, 'from_stop_id');
    }

    /**
     * The stop this connection arrives AT.
     */
    public function toStop(): BelongsTo
    {
        return $this->belongsTo(TransitStop::class, 'to_stop_id');
    }
}
