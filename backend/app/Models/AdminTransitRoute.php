<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdminTransitRoute extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'origin_name',
        'origin_lat',
        'origin_lng',
        'dest_name',
        'dest_lat',
        'dest_lng',
        'total_fare',
        'total_duration_minutes',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'origin_lat' => 'float',
            'origin_lng' => 'float',
            'dest_lat' => 'float',
            'dest_lng' => 'float',
            'total_fare' => 'float',
            'total_duration_minutes' => 'integer',
        ];
    }

    public function legs()
    {
        return $this->hasMany(AdminTransitLeg::class, 'route_id')->orderBy('sequence', 'asc');
    }
}
