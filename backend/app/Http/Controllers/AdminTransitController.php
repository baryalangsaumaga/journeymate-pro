<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\AdminTransitRoute;
use App\Models\AdminTransitLeg;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminTransitController extends Controller
{
    /**
     * List all admin-plotted transit routes with their legs.
     */
    public function index()
    {
        $routes = AdminTransitRoute::with('legs')->orderBy('created_at', 'desc')->get();
        return response()->json($routes);
    }

    /**
     * Store a new admin-plotted transit route with legs.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'origin_name' => 'required|string',
            'origin_lat' => 'required|numeric',
            'origin_lng' => 'required|numeric',
            'dest_name' => 'required|string',
            'dest_lat' => 'required|numeric',
            'dest_lng' => 'required|numeric',
            'total_fare' => 'nullable|numeric|min:0',
            'total_duration_minutes' => 'nullable|integer|min:0',
            'notes' => 'nullable|string',
            'legs' => 'required|array|min:1',
            'legs.*.sequence' => 'required|integer',
            'legs.*.mode' => 'required|string',
            'legs.*.route_name' => 'required|string',
            'legs.*.provider' => 'nullable|string',
            'legs.*.fare' => 'nullable|numeric|min:0',
            'legs.*.duration_minutes' => 'nullable|integer|min:0',
            'legs.*.instructions' => 'nullable|string',
            'legs.*.start_lat' => 'required|numeric',
            'legs.*.start_lng' => 'required|numeric',
            'legs.*.end_lat' => 'required|numeric',
            'legs.*.end_lng' => 'required|numeric',
            'legs.*.path_coordinates' => 'nullable|array',
        ]);

        return DB::transaction(function () use ($validated) {
            $route = AdminTransitRoute::create([
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'origin_name' => $validated['origin_name'],
                'origin_lat' => $validated['origin_lat'],
                'origin_lng' => $validated['origin_lng'],
                'dest_name' => $validated['dest_name'],
                'dest_lat' => $validated['dest_lat'],
                'dest_lng' => $validated['dest_lng'],
                'total_fare' => $validated['total_fare'] ?? 0.0,
                'total_duration_minutes' => $validated['total_duration_minutes'] ?? 0,
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($validated['legs'] as $legData) {
                $route->legs()->create([
                    'sequence' => $legData['sequence'],
                    'mode' => strtolower($legData['mode']),
                    'route_name' => $legData['route_name'],
                    'provider' => $legData['provider'] ?? null,
                    'fare' => $legData['fare'] ?? 0.0,
                    'duration_minutes' => $legData['duration_minutes'] ?? 0,
                    'instructions' => $legData['instructions'] ?? null,
                    'start_lat' => $legData['start_lat'],
                    'start_lng' => $legData['start_lng'],
                    'end_lat' => $legData['end_lat'],
                    'end_lng' => $legData['end_lng'],
                    'path_coordinates' => $legData['path_coordinates'] ?? [],
                ]);
            }

            return response()->json($route->load('legs'), 201);
        });
    }

    /**
     * Display a specific admin transit route.
     */
    public function show($id)
    {
        $route = AdminTransitRoute::with('legs')->findOrFail($id);
        return response()->json($route);
    }

    /**
     * Update an admin transit route and its legs.
     */
    public function update(Request $request, $id)
    {
        $route = AdminTransitRoute::findOrFail($id);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'origin_name' => 'sometimes|required|string',
            'origin_lat' => 'sometimes|required|numeric',
            'origin_lng' => 'sometimes|required|numeric',
            'dest_name' => 'sometimes|required|string',
            'dest_lat' => 'sometimes|required|numeric',
            'dest_lng' => 'sometimes|required|numeric',
            'total_fare' => 'nullable|numeric|min:0',
            'total_duration_minutes' => 'nullable|integer|min:0',
            'notes' => 'nullable|string',
            'legs' => 'nullable|array',
            'legs.*.sequence' => 'required|integer',
            'legs.*.mode' => 'required|string',
            'legs.*.route_name' => 'required|string',
            'legs.*.provider' => 'nullable|string',
            'legs.*.fare' => 'nullable|numeric|min:0',
            'legs.*.duration_minutes' => 'nullable|integer|min:0',
            'legs.*.instructions' => 'nullable|string',
            'legs.*.start_lat' => 'required|numeric',
            'legs.*.start_lng' => 'required|numeric',
            'legs.*.end_lat' => 'required|numeric',
            'legs.*.end_lng' => 'required|numeric',
            'legs.*.path_coordinates' => 'nullable|array',
        ]);

        return DB::transaction(function () use ($route, $validated) {
            $route->update(array_filter([
                'title' => $validated['title'] ?? $route->title,
                'description' => $validated['description'] ?? $route->description,
                'origin_name' => $validated['origin_name'] ?? $route->origin_name,
                'origin_lat' => $validated['origin_lat'] ?? $route->origin_lat,
                'origin_lng' => $validated['origin_lng'] ?? $route->origin_lng,
                'dest_name' => $validated['dest_name'] ?? $route->dest_name,
                'dest_lat' => $validated['dest_lat'] ?? $route->dest_lat,
                'dest_lng' => $validated['dest_lng'] ?? $route->dest_lng,
                'total_fare' => $validated['total_fare'] ?? $route->total_fare,
                'total_duration_minutes' => $validated['total_duration_minutes'] ?? $route->total_duration_minutes,
                'notes' => $validated['notes'] ?? $route->notes,
            ]));

            if (isset($validated['legs'])) {
                $route->legs()->delete();
                foreach ($validated['legs'] as $legData) {
                    $route->legs()->create([
                        'sequence' => $legData['sequence'],
                        'mode' => strtolower($legData['mode']),
                        'route_name' => $legData['route_name'],
                        'provider' => $legData['provider'] ?? null,
                        'fare' => $legData['fare'] ?? 0.0,
                        'duration_minutes' => $legData['duration_minutes'] ?? 0,
                        'instructions' => $legData['instructions'] ?? null,
                        'start_lat' => $legData['start_lat'],
                        'start_lng' => $legData['start_lng'],
                        'end_lat' => $legData['end_lat'],
                        'end_lng' => $legData['end_lng'],
                        'path_coordinates' => $legData['path_coordinates'] ?? [],
                    ]);
                }
            }

            return response()->json($route->fresh('legs'));
        });
    }

    /**
     * Delete an admin transit route.
     */
    public function destroy($id)
    {
        $route = AdminTransitRoute::findOrFail($id);
        $route->delete();
        return response()->json(['message' => 'Admin transit route deleted successfully.']);
    }

    /**
     * Match user navigation origin & destination against admin-plotted transit routes.
     */
    public function matchRoute(Request $request)
    {
        $request->validate([
            'start_lat' => 'required|numeric',
            'start_lng' => 'required|numeric',
            'end_lat' => 'required|numeric',
            'end_lng' => 'required|numeric',
            'max_distance_km' => 'nullable|numeric|min:0.5',
        ]);

        $startLat = (float) $request->start_lat;
        $startLng = (float) $request->start_lng;
        $endLat = (float) $request->end_lat;
        $endLng = (float) $request->end_lng;
        $maxDistKm = (float) ($request->max_distance_km ?? 15.0);

        $routes = AdminTransitRoute::with('legs')->get();

        $bestMatch = null;
        $bestMatchScore = PHP_INT_MAX;

        foreach ($routes as $route) {
            if ($route->legs->isEmpty()) continue;

            $firstLeg = $route->legs->first();
            $lastLeg = $route->legs->last();

            // Measure distance from user start to 1st leg pickup point
            $distToStart = $this->haversineKm($startLat, $startLng, (float)$firstLeg->start_lat, (float)$firstLeg->start_lng);
            // Measure distance from last leg drop-off point to user destination
            $distToEnd = $this->haversineKm((float)$lastLeg->end_lat, (float)$lastLeg->end_lng, $endLat, $endLng);

            if ($distToStart <= $maxDistKm && $distToEnd <= $maxDistKm) {
                $totalScore = $distToStart + $distToEnd;
                if ($totalScore < $bestMatchScore) {
                    $bestMatchScore = $totalScore;
                    $bestMatch = [
                        'route' => $route,
                        'dist_to_start_km' => round($distToStart, 2),
                        'dist_to_end_km' => round($distToEnd, 2),
                    ];
                }
            }
        }

        if (!$bestMatch) {
            return response()->json([
                'matched' => false,
                'message' => 'No admin-plotted transit route found for this area.',
            ]);
        }

        return response()->json([
            'matched' => true,
            'match_data' => $bestMatch,
        ]);
    }

    private function haversineKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371; // Earth radius in km
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) * sin($dLat / 2) +
            cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
            sin($dLng / 2) * sin($dLng / 2);
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        return $earthRadius * $c;
    }
}
