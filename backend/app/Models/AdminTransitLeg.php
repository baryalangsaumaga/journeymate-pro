<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdminTransitLeg extends Model
{
    use HasFactory;

    protected $fillable = [
        'route_id',
        'sequence',
        'mode',
        'route_name',
        'provider',
        'fare',
        'duration_minutes',
        'instructions',
        'start_lat',
        'start_lng',
        'end_lat',
        'end_lng',
        'path_coordinates',
    ];

    protected function casts(): array
    {
        return [
            'sequence' => 'integer',
            'fare' => 'float',
            'duration_minutes' => 'integer',
            'start_lat' => 'float',
            'start_lng' => 'float',
            'end_lat' => 'float',
            'end_lng' => 'float',
            'path_coordinates' => 'array',
        ];
    }

    public function route()
    {
        return $this->belongsTo(AdminTransitRoute::class, 'route_id');
    }
}
