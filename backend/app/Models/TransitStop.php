<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TransitStop extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'type',
        'lat',
        'lng',
        'address',
        'vehicles',
        'facilities',
        'operating_hours',
        'notes',
    ];

    protected $appends = ['latitude', 'longitude'];

    public function getLatitudeAttribute(): float
    {
        return (float) $this->lat;
    }

    public function getLongitudeAttribute(): float
    {
        return (float) $this->lng;
    }

    protected function casts(): array
    {
        return [
            'lat' => 'float',
            'lng' => 'float',
            'vehicles' => 'array',
            'facilities' => 'array',
        ];
    }

    /**
     * Connections departing FROM this stop.
     */
    public function outgoingConnections(): HasMany
    {
        return $this->hasMany(TransitConnection::class, 'from_stop_id');
    }

    /**
     * Connections arriving AT this stop.
     */
    public function incomingConnections(): HasMany
    {
        return $this->hasMany(TransitConnection::class, 'to_stop_id');
    }

    /**
     * Get all traversable connections from this stop (outgoing + bidirectional incoming).
     *
     * @return \Illuminate\Support\Collection
     */
    public function allTraversableConnections(): \Illuminate\Support\Collection
    {
        $outgoing = $this->outgoingConnections()->with('toStop')->get();
        $bidirectionalIncoming = $this->incomingConnections()
            ->where('is_bidirectional', true)
            ->with('fromStop')
            ->get();

        return $outgoing->merge($bidirectionalIncoming);
    }
}
