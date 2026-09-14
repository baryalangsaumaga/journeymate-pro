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
        if (!Schema::hasTable('admin_transit_routes')) {
            Schema::create('admin_transit_routes', function (Blueprint $table) {
                $table->id();
                $table->string('title')->index();
                $table->text('description')->nullable();
                $table->string('origin_name');
                $table->decimal('origin_lat', 10, 6)->index();
                $table->decimal('origin_lng', 10, 6)->index();
                $table->string('dest_name');
                $table->decimal('dest_lat', 10, 6)->index();
                $table->decimal('dest_lng', 10, 6)->index();
                $table->decimal('total_fare', 8, 2)->default(0.00);
                $table->integer('total_duration_minutes')->default(0);
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('admin_transit_legs')) {
            Schema::create('admin_transit_legs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('route_id')->constrained('admin_transit_routes')->onDelete('cascade');
                $table->integer('sequence')->default(1);
                $table->string('mode')->default('jeepney'); // walk, bus, jeepney, tricycle, train, uv, ferry, car
                $table->string('route_name');
                $table->string('provider')->nullable();
                $table->decimal('fare', 8, 2)->default(0.00);
                $table->integer('duration_minutes')->default(0);
                $table->text('instructions')->nullable();
                $table->decimal('start_lat', 10, 6);
                $table->decimal('start_lng', 10, 6);
                $table->decimal('end_lat', 10, 6);
                $table->decimal('end_lng', 10, 6);
                $table->json('path_coordinates')->nullable(); // [[lat, lng], [lat, lng], ...]
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('admin_transit_legs');
        Schema::dropIfExists('admin_transit_routes');
    }
};
