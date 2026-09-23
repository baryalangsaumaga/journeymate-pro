<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('transit_stops')) {
            Schema::create('transit_stops', function (Blueprint $table) {
                $table->id();
                $table->string('name')->index();
                $table->string('type', 100)->default('Junction Stop'); // Central Terminal, TODA Stand, Junction Stop, Bus Stop, Train Station
                $table->decimal('lat', 10, 6)->index();
                $table->decimal('lng', 10, 6)->index();
                $table->text('address')->nullable();
                $table->json('vehicles')->nullable();       // ["jeepney", "bus", "uv"]
                $table->json('facilities')->nullable();     // ["Waiting Lounge", "Restrooms"]
                $table->string('operating_hours')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->index(['lat', 'lng'], 'transit_stops_spatial_idx');
            });
        }

        if (!Schema::hasTable('transit_connections')) {
            Schema::create('transit_connections', function (Blueprint $table) {
                $table->id();
                $table->foreignId('from_stop_id')->constrained('transit_stops')->onDelete('cascade');
                $table->foreignId('to_stop_id')->constrained('transit_stops')->onDelete('cascade');
                $table->string('mode', 50)->default('jeepney'); // jeepney, bus, tricycle, walk, uv, train, ferry
                $table->string('route_name')->nullable();
                $table->string('provider')->nullable();
                $table->decimal('fare', 8, 2)->default(0.00);
                $table->integer('duration_minutes')->default(0);
                $table->integer('distance_meters')->default(0);
                $table->text('instructions')->nullable();
                $table->json('path_coordinates')->nullable(); // [[lng,lat], ...] GeoJSON polyline
                $table->boolean('is_bidirectional')->default(true);
                $table->string('operating_hours')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->index('from_stop_id');
                $table->index('to_stop_id');
                $table->index('mode');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transit_connections');
        Schema::dropIfExists('transit_stops');
    }
};
