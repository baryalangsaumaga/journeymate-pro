<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\TransitStop;
use App\Models\TransitConnection;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class TransitStopController extends Controller
{
    /**
     * List all transit stops with their outgoing connections (Admin).
     */
    public function index(): JsonResponse
    {
        $stops = TransitStop::with(['outgoingConnections.toStop', 'incomingConnections.fromStop'])
            ->orderBy('name', 'asc')
            ->get();

        return response()->json($stops);
    }

    /**
     * Public: list all stops for user map rendering.
     */
    public function allPublic(): JsonResponse
    {
        $stops = TransitStop::select('id', 'name', 'type', 'lat', 'lng', 'address', 'vehicles', 'facilities', 'operating_hours')
            ->orderBy('name', 'asc')
            ->get();

        return response()->json($stops);
    }

    /**
     * Public: find stops near a lat/lng within radius.
     */
    public function nearby(Request $request): JsonResponse
    {
        $request->validate([
            'lat' => 'required|numeric',
            'lng' => 'required|numeric',
            'radius_km' => 'nullable|numeric|min:0.1|max:50',
        ]);

        $lat = (float) $request->lat;
        $lng = (float) $request->lng;
        $radiusKm = (float) ($request->radius_km ?? 5.0);

        // Haversine-based distance filter in SQL
        $stops = TransitStop::select('id', 'name', 'type', 'lat', 'lng', 'address', 'vehicles', 'facilities', 'operating_hours')
            ->selectRaw(
                '(6371 * acos(cos(radians(?)) * cos(radians(lat)) * cos(radians(lng) - radians(?)) + sin(radians(?)) * sin(radians(lat)))) AS distance_km',
                [$lat, $lng, $lat]
            )
            ->having('distance_km', '<=', $radiusKm)
            ->orderBy('distance_km', 'asc')
            ->limit(20)
            ->get();

        return response()->json($stops);
    }

    /**
     * Store a new transit stop (Admin).
     */
    /**
     * Store a new transit stop (Admin).
     */
    public function store(Request $request): JsonResponse
    {
        if ($request->has('latitude') && !$request->has('lat')) {
            $request->merge(['lat' => $request->input('latitude')]);
        }
        if ($request->has('longitude') && !$request->has('lng')) {
            $request->merge(['lng' => $request->input('longitude')]);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string|max:100',
            'lat' => 'required|numeric',
            'lng' => 'required|numeric',
            'city' => 'nullable|string|max:255',
            'province' => 'nullable|string|max:255',
            'address' => 'nullable|string',
            'vehicles' => 'nullable|array',
            'facilities' => 'nullable|array',
            'operating_hours' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $stop = TransitStop::create($validated);

        return response()->json($stop->load(['outgoingConnections.toStop']), 201);
    }

    /**
     * Display a specific transit stop (Admin).
     */
    public function show(int $id): JsonResponse
    {
        $stop = TransitStop::with(['outgoingConnections.toStop', 'incomingConnections.fromStop'])
            ->findOrFail($id);

        return response()->json($stop);
    }

    /**
     * Update a transit stop (Admin).
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $stop = TransitStop::findOrFail($id);

        if ($request->has('latitude') && !$request->has('lat')) {
            $request->merge(['lat' => $request->input('latitude')]);
        }
        if ($request->has('longitude') && !$request->has('lng')) {
            $request->merge(['lng' => $request->input('longitude')]);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'type' => 'sometimes|required|string|max:100',
            'lat' => 'sometimes|required|numeric',
            'lng' => 'sometimes|required|numeric',
            'city' => 'nullable|string|max:255',
            'province' => 'nullable|string|max:255',
            'address' => 'nullable|string',
            'vehicles' => 'nullable|array',
            'facilities' => 'nullable|array',
            'operating_hours' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $stop->update($validated);

        return response()->json($stop->fresh(['outgoingConnections.toStop']));
    }

    /**
     * Soft-delete a transit stop (Admin).
     */
    public function destroy(int $id): JsonResponse
    {
        $stop = TransitStop::findOrFail($id);
        $stop->delete();

        return response()->json(['message' => 'Transit stop deleted successfully.']);
    }

    /**
     * List all transit connections (Public/Admin).
     */
    public function allConnections(): JsonResponse
    {
        $connections = TransitConnection::with(['fromStop', 'toStop'])
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($connections);
    }

    /**
     * Add a connection between two stops (Admin).
     */
    public function addConnection(Request $request, ?int $id = null): JsonResponse
    {
        $fromStopId = $id ?? (int) $request->input('from_stop_id');
        $fromStop = TransitStop::findOrFail($fromStopId);

        $validated = $request->validate([
            'from_stop_id' => 'sometimes|required|integer|exists:transit_stops,id',
            'to_stop_id' => 'required|integer|exists:transit_stops,id',
            'mode' => 'required|string|max:50',
            'route_name' => 'nullable|string|max:255',
            'provider' => 'nullable|string|max:255',
            'fare' => 'nullable|numeric|min:0',
            'duration_minutes' => 'nullable|integer|min:0',
            'distance_meters' => 'nullable|integer|min:0',
            'instructions' => 'nullable|string',
            'path_coordinates' => 'nullable|array',
            'is_bidirectional' => 'nullable|boolean',
            'operating_hours' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        if ((int) $validated['to_stop_id'] === $fromStopId) {
            return response()->json(['message' => 'Cannot connect a stop to itself.'], 422);
        }

        $connection = TransitConnection::create([
            'from_stop_id' => $fromStopId,
            'to_stop_id' => $validated['to_stop_id'],
            'mode' => strtolower($validated['mode']),
            'route_name' => $validated['route_name'] ?? null,
            'provider' => $validated['provider'] ?? null,
            'fare' => $validated['fare'] ?? 0.0,
            'duration_minutes' => $validated['duration_minutes'] ?? 0,
            'distance_meters' => $validated['distance_meters'] ?? 0,
            'instructions' => $validated['instructions'] ?? null,
            'path_coordinates' => $validated['path_coordinates'] ?? null,
            'is_bidirectional' => $validated['is_bidirectional'] ?? true,
            'operating_hours' => $validated['operating_hours'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json($connection->load(['fromStop', 'toStop']), 201);
    }

    /**
     * Update a connection (Admin).
     */
    public function updateConnection(Request $request, int $connectionId): JsonResponse
    {
        $connection = TransitConnection::findOrFail($connectionId);

        $validated = $request->validate([
            'mode' => 'sometimes|required|string|max:50',
            'route_name' => 'nullable|string|max:255',
            'provider' => 'nullable|string|max:255',
            'fare' => 'nullable|numeric|min:0',
            'duration_minutes' => 'nullable|integer|min:0',
            'distance_meters' => 'nullable|integer|min:0',
            'instructions' => 'nullable|string',
            'path_coordinates' => 'nullable|array',
            'is_bidirectional' => 'nullable|boolean',
            'operating_hours' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $connection->update($validated);

        return response()->json($connection->fresh(['fromStop', 'toStop']));
    }

    /**
     * Delete a connection (Admin).
     */
    public function deleteConnection(int $connectionId): JsonResponse
    {
        $connection = TransitConnection::findOrFail($connectionId);
        $connection->delete();

        return response()->json(['message' => 'Connection deleted successfully.']);
    }

    /**
     * Bulk import stops from localStorage transit hubs payload (Admin).
     */
    public function bulkImport(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'hubs' => 'required|array|min:1',
            'hubs.*.name' => 'required|string|max:255',
            'hubs.*.type' => 'nullable|string|max:100',
            'hubs.*.lat' => 'required|numeric',
            'hubs.*.lng' => 'required|numeric',
            'hubs.*.address' => 'nullable|string',
            'hubs.*.vehicles' => 'nullable|array',
            'hubs.*.facilities' => 'nullable|array',
            'hubs.*.hours' => 'nullable|string|max:255',
        ]);

        $imported = 0;

        DB::transaction(function () use ($validated, &$imported) {
            foreach ($validated['hubs'] as $hub) {
                // Skip duplicates (same name + similar coordinates)
                $exists = TransitStop::where('name', $hub['name'])
                    ->whereRaw('ABS(lat - ?) < 0.001 AND ABS(lng - ?) < 0.001', [$hub['lat'], $hub['lng']])
                    ->exists();

                if (!$exists) {
                    TransitStop::create([
                        'name' => $hub['name'],
                        'type' => $hub['type'] ?? 'Junction Stop',
                        'lat' => $hub['lat'],
                        'lng' => $hub['lng'],
                        'address' => $hub['address'] ?? null,
                        'vehicles' => $hub['vehicles'] ?? [],
                        'facilities' => $hub['facilities'] ?? [],
                        'operating_hours' => $hub['hours'] ?? null,
                    ]);
                    $imported++;
                }
            }
        });

        return response()->json([
            'message' => "Imported {$imported} transit stops successfully.",
            'imported_count' => $imported,
        ]);
    }
}
