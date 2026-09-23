<?php

namespace App\Services;

use App\Models\TransitStop;
use App\Models\TransitConnection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RouteService
{
    protected $osrmBaseUrl = 'https://router.project-osrm.org';

    /**
     * Calculate route for multiple waypoints
     * @param array $waypoints Array of [lat, lng] arrays
     * @param string $mode 'car', 'bike', 'walk', etc.
     * @param bool $alternatives Whether to request alternative routes from OSRM
     */
    public function calculateRoute($waypoints, $mode = 'car', $alternatives = true, $originName = 'Your Starting Location', $destName = 'Destination')
    {
        if (count($waypoints) < 2) return null;

        if ($mode === 'transit') {
            // 1. Try Network Graph Router (Dijkstra through admin-plotted stops)
            $networkRoute = $this->calculateNetworkTransitRoute($waypoints, $originName, $destName);
            if ($networkRoute !== null) {
                return $networkRoute;
            }

            // 2. Try Admin Hybrid Route (pre-defined express corridors)
            $adminHybrid = $this->calculateAdminHybridTransitRoute($waypoints, $originName, $destName);
            if ($adminHybrid !== null) {
                return $adminHybrid;
            }

            $googleTransit = $this->calculateGoogleTransitRoute($waypoints);
            if ($googleTransit !== null) {
                return $googleTransit;
            }

            $transitRoute = $this->calculateGeoapifyRoute($waypoints, 'transit');
            if ($transitRoute !== null) {
                return $transitRoute;
            }

            Log::info("Generating provincial public commute route fallback");
            return $this->generateProvincialTransitFallbackRoute($waypoints, $originName, $destName);
        }

        $profile = match($mode) {
            'bicycle', 'bike' => 'cycling',
            'walk', 'foot' => 'foot',
            default => 'driving'
        };

        // 2. Format Coordinates: "lng,lat;lng,lat;..."
        $coordString = implode(';', array_map(fn($wp) => "{$wp[1]},{$wp[0]}", $waypoints));
        
        $url = "{$this->osrmBaseUrl}/route/v1/{$profile}/{$coordString}";

        try {
            $response = Http::get($url, [
                'overview' => 'full',
                'geometries' => 'geojson',
                'steps' => 'true',
                'annotations' => 'true',
                'alternatives' => $alternatives ? 'true' : 'false'
            ]);

            if ($response->failed() || !isset($response['routes'][0])) {
                Log::warning("OSRM Route Failed: " . $response->body());
                return $this->handleOsrmFailure($waypoints, $mode);
            }

            $data = $response->json();

            // OSRM public demo server defaults all profiles to 'driving' speed/duration.
            // We override the duration dynamically based on the requested travel mode
            // to ensure accurate travel times are returned to the frontend.
            if (isset($data['routes'])) {
                foreach ($data['routes'] as &$r) {
                    $distance = $r['distance'] ?? 0; // in meters
                    
                    // Choose realistic speed divisor (meters per second)
                    $speed = null;
                    if ($mode === 'walk' || $mode === 'foot') {
                        $speed = 1.39; // Walking speed (~5 km/h)
                    } elseif ($mode === 'bicycle' || $mode === 'bike') {
                        $speed = 4.44; // Cycling speed (~16 km/h)
                    } elseif ($mode === 'transit') {
                        $speed = 6.11; // Transit speed (~22 km/h)
                    }
                    
                    if ($speed !== null) {
                        $r['duration'] = $distance / $speed;
                        if (isset($r['legs'])) {
                            foreach ($r['legs'] as &$leg) {
                                $legDistance = $leg['distance'] ?? $distance;
                                $leg['duration'] = $legDistance / $speed;
                                if (isset($leg['steps'])) {
                                    foreach ($leg['steps'] as &$step) {
                                        $stepDistance = $step['distance'] ?? 0;
                                        $step['duration'] = $stepDistance / $speed;
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Fetch Toll-Free Alternative from Geoapify if mode is car
            if ($mode === 'car' && $alternatives) {
                $tollFreeRoute = $this->calculateGeoapifyRoute($waypoints, 'drive', 'tolls');
                if ($tollFreeRoute && isset($tollFreeRoute['routes'][0])) {
                    // Tag it so the frontend knows it's the toll-free alternative
                    $tollFree = $tollFreeRoute['routes'][0];
                    $tollFree['is_toll_free'] = true;
                    // Prepend or append to alternatives (OSRM routes[0] is primary)
                    if (isset($data['routes'])) {
                        $data['routes'][] = $tollFree;
                    } else {
                        $data['routes'] = [$tollFree];
                    }
                }
            }

            return $data;

        } catch (\Exception $e) {
            Log::error("Route Calculation Exception: " . $e->getMessage());
            return $this->handleOsrmFailure($waypoints, $mode);
        }
    }

    protected function handleOsrmFailure($waypoints, $mode) {
        $geoapifyMode = match($mode) {
            'bicycle', 'bike' => 'bicycle',
            'walk', 'foot' => 'walk',
            default => 'drive'
        };
        $fallback = $this->calculateGeoapifyRoute($waypoints, $geoapifyMode);
        if ($fallback && isset($fallback['routes'][0])) {
            return $fallback;
        }

        // Ultimate fallback: straight line
        return $this->generateFallbackStraightLine($waypoints, $mode);
    }

    protected function generateFallbackStraightLine($waypoints, $mode) {
        $distance = 0;
        for ($i = 0; $i < count($waypoints) - 1; $i++) {
            $distance += $this->haversineDistance($waypoints[$i], $waypoints[$i+1]);
        }
        $speed = match($mode) {
            'walk', 'foot' => 1.39,
            'bicycle', 'bike' => 4.44,
            'transit' => 6.11,
            default => 13.89
        };
        $duration = $distance / $speed;
        $coords = array_map(fn($w) => [$w[1], $w[0]], $waypoints);

        return [
            'routes' => [[
                'distance' => $distance,
                'duration' => $duration,
                'geometry' => [
                    'type' => 'LineString',
                    'coordinates' => $coords
                ],
                'legs' => [[
                    'distance' => $distance,
                    'duration' => $duration,
                    'steps' => [
                        [
                            'distance' => $distance,
                            'duration' => $duration,
                            'maneuver' => [
                                'type' => 'depart',
                                'location' => [$waypoints[0][1], $waypoints[0][0]]
                            ],
                            'name' => 'Straight line fallback'
                        ],
                        [
                            'distance' => 0,
                            'duration' => 0,
                            'maneuver' => [
                                'type' => 'arrive',
                                'location' => [$waypoints[count($waypoints)-1][1], $waypoints[count($waypoints)-1][0]]
                            ],
                            'name' => ''
                        ]
                    ]
                ]]
            ]]
        ];
    }

    protected function haversineDistance($a, $b) {
        $R = 6371000;
        $dLat = deg2rad($b[0] - $a[0]);
        $dLon = deg2rad($b[1] - $a[1]);
        $x = sin($dLat/2) * sin($dLat/2) + cos(deg2rad($a[0])) * cos(deg2rad($b[0])) * sin($dLon/2) * sin($dLon/2);
        return 2 * $R * asin(sqrt($x));
    }

    /**
     * Fetch and format route from Geoapify to match OSRM structure.
     */
    protected function calculateGeoapifyRoute($waypoints, $mode = 'transit', $avoid = null)
    {
        $apiKey = env('GEOAPIFY_KEY');
        if (!$apiKey) {
            Log::error("GEOAPIFY_KEY is missing from environment variables.");
            return null;
        }

        $coordString = implode('|', array_map(fn($wp) => "{$wp[0]},{$wp[1]}", $waypoints));
        $url = "https://api.geoapify.com/v1/routing?waypoints={$coordString}&mode={$mode}&apiKey={$apiKey}";
        
        if ($avoid) {
            $url .= "&avoid={$avoid}";
        }

        try {
            $response = Http::get($url);

            if ($response->failed() || !isset($response['features'][0])) {
                Log::warning("Geoapify Transit Failed: " . $response->body());
                return null;
            }

            $feature = $response['features'][0];
            $props = $feature['properties'];
            $distance = $props['distance'] ?? 0;
            $duration = $props['time'] ?? 0;

            // Extract flat coordinates
            $flatCoords = [];
            if (isset($feature['geometry']['type']) && $feature['geometry']['type'] === 'MultiLineString') {
                foreach ($feature['geometry']['coordinates'] as $line) {
                    foreach ($line as $pt) {
                        $flatCoords[] = $pt;
                    }
                }
            } else {
                $flatCoords = $feature['geometry']['coordinates'] ?? [];
            }

            // Map Geoapify steps to OSRM format
            $osrmSteps = [];
            if (isset($props['legs'])) {
                foreach ($props['legs'] as $leg) {
                    if (isset($leg['steps'])) {
                        foreach ($leg['steps'] as $step) {
                            $fromIdx = $step['from_index'] ?? 0;
                            // Geoapify returns [lng, lat], just like OSRM GeoJSON geometry
                            $location = $flatCoords[$fromIdx] ?? [0, 0];
                            
                            $osrmSteps[] = [
                                'distance' => $step['distance'] ?? 0,
                                'duration' => $step['time'] ?? 0,
                                'name' => $step['instruction']['text'] ?? '',
                                'maneuver' => [
                                    'type' => 'turn',
                                    'modifier' => '',
                                    'location' => $location
                                ]
                            ];
                        }
                    }
                }
            }

            // Return mock OSRM format
            return [
                'routes' => [
                    [
                        'distance' => $distance,
                        'duration' => $duration,
                        'geometry' => [
                            'coordinates' => $flatCoords
                        ],
                        'legs' => [
                            [
                                'distance' => $distance,
                                'duration' => $duration,
                                'steps' => $osrmSteps
                            ]
                        ]
                    ]
                ]
            ];

        } catch (\Exception $e) {
            Log::error("Geoapify Route Exception: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Get alternative routes (Used for "Calculate Route" feature)
     */
    public function getRouteAlternatives($waypoints)
    {
        $route = $this->calculateRoute($waypoints, 'car', true);
        return $route ? $route['routes'] : [];
    }

    /**
     * Extract Speed Limits from Route Data
     */
    public function getSpeedLimits($routeData)
    {
        // OSRM annotations for maxspeed are complex. 
        // We will simulate a simplified list based on steps for the UI.
        
        $limits = [];
        $steps = $routeData['legs'][0]['steps'] ?? [];

        foreach ($steps as $step) {
            $name = $step['name'] ?? 'Unknown Road';
            if (empty($name)) continue;

            // Simple heuristic since free OSRM rarely returns maxspeed data
            // Highway/Way/Ave usually faster
            $speed = 40;
            if (stripos($name, 'Highway') !== false || stripos($name, 'Expressway') !== false) $speed = 80;
            elseif (stripos($name, 'Avenue') !== false || stripos($name, 'Road') !== false) $speed = 60;

            // De-duplicate
            if (!isset($limits[$name])) {
                $limits[$name] = [
                    'name' => $name,
                    'max_speed' => $speed
                ];
            }
        }

        return array_values($limits);
    }

    /**
     * Calculate transit route via Google Maps Transit API (RapidAPI or Direct Key)
     */
    protected function calculateGoogleTransitRoute($waypoints)
    {
        $rapidApiKey = env('RAPIDAPI_KEY');
        $googleKey = env('GOOGLE_MAPS_API_KEY', env('GOOGLE_API_KEY'));

        if (count($waypoints) < 2) return null;

        $origin = "{$waypoints[0][0]},{$waypoints[0][1]}";
        $dest = "{$waypoints[count($waypoints) - 1][0]},{$waypoints[count($waypoints) - 1][1]}";

        $responseData = null;

        // 1. Try RapidAPI Google Directions host if RAPIDAPI_KEY exists
        if ($rapidApiKey) {
            try {
                $res = Http::withHeaders([
                    'x-rapidapi-host' => 'google-maps-geocoding-direction-places.p.rapidapi.com',
                    'x-rapidapi-key' => $rapidApiKey,
                ])->get('https://google-maps-geocoding-direction-places.p.rapidapi.com/directions/json', [
                    'origin' => $origin,
                    'destination' => $dest,
                    'mode' => 'transit',
                ]);

                if ($res->successful() && isset($res['routes'][0])) {
                    $responseData = $res->json();
                }
            } catch (\Exception $e) {
                Log::warning("RapidAPI Google Transit Exception: " . $e->getMessage());
            }
        }

        // 2. Try direct Google Maps API if key exists
        if (!$responseData && $googleKey) {
            try {
                $res = Http::get('https://maps.googleapis.com/maps/api/directions/json', [
                    'origin' => $origin,
                    'destination' => $dest,
                    'mode' => 'transit',
                    'key' => $googleKey,
                ]);

                if ($res->successful() && isset($res['routes'][0])) {
                    $responseData = $res->json();
                }
            } catch (\Exception $e) {
                Log::warning("Direct Google Transit Exception: " . $e->getMessage());
            }
        }

        if (!$responseData || !isset($responseData['routes'][0])) {
            return null;
        }

        return $this->formatGoogleTransitResponse($responseData);
    }

    /**
     * Generate structured provincial public commute fallback when GTFS feeds return ZERO_RESULTS
     */
    protected function generateProvincialTransitFallbackRoute($waypoints, $originName = 'Your Starting Location', $destName = 'Destination')
    {
        $coordString = implode(';', array_map(fn($wp) => "{$wp[1]},{$wp[0]}", $waypoints));
        // Get full driving step-by-step route from OSRM to extract actual road names & coordinates
        $url = "{$this->osrmBaseUrl}/route/v1/driving/{$coordString}?overview=full&geometries=geojson&steps=true";

        $flatCoords = [];
        $distance = 0;
        $duration = 0;
        $osrmSteps = [];

        try {
            $res = Http::get($url);
            if ($res->successful() && isset($res['routes'][0])) {
                $r = $res['routes'][0];
                $distance = $r['distance'] ?? 0;
                $duration = $distance / 6.11; // ~22 km/h average public transport speed
                $flatCoords = $r['geometry']['coordinates'] ?? [];
                $osrmSteps = $r['legs'][0]['steps'] ?? [];
            }
        } catch (\Exception $e) {
            Log::warning("OSRM Transit Polyline Failed: " . $e->getMessage());
        }

        if (empty($flatCoords)) {
            $flatCoords = array_map(fn($w) => [$w[1], $w[0]], $waypoints);
            for ($i = 0; $i < count($waypoints) - 1; $i++) {
                $distance += $this->haversineDistance($waypoints[$i], $waypoints[$i+1]);
            }
            $duration = $distance / 6.11;
        }

        // Extract real road names & first/last leg distances from OSRM steps
        $roadNames = [];
        foreach ($osrmSteps as $step) {
            $rName = trim($step['name'] ?? '');
            if (!empty($rName) && !in_array($rName, $roadNames)) {
                $roadNames[] = $rName;
            }
        }

        $firstStepDist = $osrmSteps[0]['distance'] ?? 0;
        $lastStepDist = count($osrmSteps) > 1 ? ($osrmSteps[count($osrmSteps) - 1]['distance'] ?? 0) : 0;

        $distKm = round($distance / 1000, 1);
        $primaryRoad = $roadNames[0] ?? 'Main Highway';
        $secRoad = $roadNames[1] ?? ($roadNames[0] ?? 'Town Road');
        $tertiaryRoad = $roadNames[2] ?? ($roadNames[1] ?? 'Local Street');

        // Dynamic First Leg: Walk if near main road (<500m), Ride tricycle/jeepney if far (>=500m)
        $isNearOriginHighway = $firstStepDist < 500;
        $firstLegType = $isNearOriginHighway ? 'walk' : 'tricycle';
        $firstLegTitle = $isNearOriginHighway ? "Walk to {$primaryRoad}" : "Local Tricycle / Jeepney to {$primaryRoad}";
        $firstLegInstr = $isNearOriginHighway 
            ? "Walk from {$originName} to nearest loading stop along {$primaryRoad} (~5 mins)"
            : "Board local tricycle or jeepney from {$originName} to {$primaryRoad} highway loading area (~8 mins)";
        $firstLegCost = $isNearOriginHighway ? 0 : 25;
        $firstLegMins = $isNearOriginHighway ? 5 : 8;

        // Dynamic Final Leg: Walk if near highway (<400m), Ride tricycle if far (>=400m)
        $isNearDestHighway = $lastStepDist < 400;
        $finalLegType = $isNearDestHighway ? 'walk' : 'tricycle';
        $finalLegTitle = $isNearDestHighway ? "Walk to {$destName}" : "Local Tricycle to {$destName}";
        $finalLegInstr = $isNearDestHighway
            ? "Alight at drop-off point along {$secRoad} and walk to {$destName} entrance (~2 mins)"
            : "Hire local tricycle from {$secRoad} drop-off point to entrance of {$destName} (~5 mins)";
        $finalLegCost = $isNearDestHighway ? 0 : 25;
        $finalLegMins = $isNearDestHighway ? 2 : 5;

        // Dynamic multi-legged segmentation based on actual distance:
        $transitSegments = [];
        $steps = [];

        if ($distKm < 1.5) {
            // Category 1: Walking Commute (< 1.5 km) -> 1 leg
            $totalMins = max(5, (int)round($distance / 80)); // walking ~4.8 km/h
            $transitSegments = [
                [
                    'id' => 'walk_seg_1',
                    'type' => 'walk',
                    'title' => "Walk to {$destName}",
                    'departureName' => $originName,
                    'arrivalName' => $destName,
                    'durationMinutes' => $totalMins,
                    'costEstimate' => 0,
                    'instructions' => "Walk directly from {$originName} to {$destName} (~{$distKm} km, ~{$totalMins} mins)",
                ]
            ];
            $steps = [
                [
                    'distance' => round($distance),
                    'duration' => $totalMins * 60,
                    'name' => "1. Walk from {$originName} directly to {$destName} (~{$distKm} km, ~{$totalMins} mins)",
                    'maneuver' => ['type' => 'transit', 'modifier' => '', 'location' => [$waypoints[0][1], $waypoints[0][0]]],
                ],
                [
                    'distance' => 0,
                    'duration' => 0,
                    'name' => "2. Arrive at {$destName}",
                    'maneuver' => ['type' => 'arrive', 'modifier' => '', 'location' => [$waypoints[count($waypoints)-1][1], $waypoints[count($waypoints)-1][0]]],
                ]
            ];
        } elseif ($distKm < 8) {
            // Category 2: Local City Commute (1.5 km to 8 km)
            $totalMins = max(10, (int)round($distance / 250));
            $leg2Mins = max(5, (int)round($totalMins * 0.7));

            $transitSegments = [
                [
                    'id' => 'local_seg_1',
                    'type' => $firstLegType,
                    'title' => $firstLegTitle,
                    'departureName' => $originName,
                    'arrivalName' => "{$primaryRoad} Loading Stop",
                    'durationMinutes' => $firstLegMins,
                    'costEstimate' => $firstLegCost,
                    'instructions' => $firstLegInstr,
                ],
                [
                    'id' => 'local_seg_2',
                    'type' => 'jeepney',
                    'title' => "City Jeepney via {$primaryRoad} to {$destName}",
                    'departureName' => "{$primaryRoad} Loading Stop",
                    'arrivalName' => "Drop-off near {$destName}",
                    'durationMinutes' => $leg2Mins,
                    'costEstimate' => 15,
                    'instructions' => "Board city jeepney or multicab along {$primaryRoad} heading towards {$destName} (~{$distKm} km, ~{$leg2Mins} mins)",
                ]
            ];

            if ($isNearDestHighway) {
                $transitSegments[] = [
                    'id' => 'local_seg_3',
                    'type' => 'walk',
                    'title' => "Walk to Entrance of {$destName}",
                    'departureName' => 'Drop-off point',
                    'arrivalName' => $destName,
                    'durationMinutes' => 2,
                    'costEstimate' => 0,
                    'instructions' => "Alight at drop-off point and walk to main entrance of {$destName} (~2 mins)",
                ];
            } else {
                $transitSegments[] = [
                    'id' => 'local_seg_3',
                    'type' => 'tricycle',
                    'title' => "Local Tricycle to Gate of {$destName}",
                    'departureName' => 'Drop-off point',
                    'arrivalName' => "Gate of {$destName}",
                    'durationMinutes' => 5,
                    'costEstimate' => 25,
                    'instructions' => "Hire local tricycle from drop-off point to gate of {$destName} (~5 mins)",
                ];
                $transitSegments[] = [
                    'id' => 'local_seg_4',
                    'type' => 'walk',
                    'title' => "Walk to Main Entrance",
                    'departureName' => 'Gate',
                    'arrivalName' => $destName,
                    'durationMinutes' => 2,
                    'costEstimate' => 0,
                    'instructions' => "Walk from gate to main entrance of {$destName} (~2 mins)",
                ];
            }

            $steps = array_map(function($seg, $idx) use ($waypoints) {
                return [
                    'distance' => 100,
                    'duration' => $seg['durationMinutes'] * 60,
                    'name' => ($idx + 1) . ". " . $seg['instructions'],
                    'maneuver' => ['type' => 'transit', 'modifier' => '', 'location' => [$waypoints[0][1], $waypoints[0][0]]],
                ];
            }, $transitSegments, array_keys($transitSegments));

            $steps[] = [
                'distance' => 0,
                'duration' => 0,
                'name' => (count($steps) + 1) . ". Arrive at {$destName}",
                'maneuver' => ['type' => 'arrive', 'modifier' => '', 'location' => [$waypoints[count($waypoints)-1][1], $waypoints[count($waypoints)-1][0]]],
            ];
        } elseif ($distKm < 25) {
            // Category 3: Medium Inter-Town Commute (8 km to 25 km)
            $totalMins = max(20, (int)round($duration / 60));
            $leg2Mins = max(12, (int)round($totalMins * 0.55));
            $leg3Mins = max(8, (int)round($totalMins * 0.3));

            $midDist = round($distKm * 0.6, 1);
            $lastDist = round($distKm * 0.4, 1);

            $transitSegments = [
                [
                    'id' => 'inter_seg_1',
                    'type' => $firstLegType,
                    'title' => $firstLegTitle,
                    'departureName' => $originName,
                    'arrivalName' => "{$primaryRoad} Highway Terminal",
                    'durationMinutes' => $firstLegMins,
                    'costEstimate' => $firstLegCost,
                    'instructions' => $firstLegInstr,
                ],
                [
                    'id' => 'inter_seg_2',
                    'type' => 'bus',
                    'title' => "Inter-Town Bus / Jeepney via {$primaryRoad} (~{$midDist} km)",
                    'departureName' => "{$primaryRoad} Terminal",
                    'arrivalName' => "{$secRoad} Junction",
                    'durationMinutes' => $leg2Mins,
                    'costEstimate' => (int)round($midDist * 2.5),
                    'instructions' => "Board inter-town bus or jeepney along {$primaryRoad} to {$secRoad} junction (~{$midDist} km, ~{$leg2Mins} mins)",
                ],
                [
                    'id' => 'inter_seg_3',
                    'type' => 'jeepney',
                    'title' => "Connecting Feeder Jeepney via {$secRoad} (~{$lastDist} km)",
                    'departureName' => "{$secRoad} Junction",
                    'arrivalName' => "Drop-off near {$destName}",
                    'durationMinutes' => $leg3Mins,
                    'costEstimate' => 20,
                    'instructions' => "Transfer to feeder jeepney along {$secRoad} heading towards {$destName} (~{$lastDist} km, ~{$leg3Mins} mins)",
                ]
            ];

            if ($isNearDestHighway) {
                $transitSegments[] = [
                    'id' => 'inter_seg_4',
                    'type' => 'walk',
                    'title' => "Walk to Entrance of {$destName}",
                    'departureName' => 'Drop-off point',
                    'arrivalName' => $destName,
                    'durationMinutes' => 2,
                    'costEstimate' => 0,
                    'instructions' => "Alight at drop-off point and walk to main entrance of {$destName} (~2 mins)",
                ];
            } else {
                $transitSegments[] = [
                    'id' => 'inter_seg_4',
                    'type' => 'tricycle',
                    'title' => "Local Tricycle to Gate of {$destName}",
                    'departureName' => 'Feeder Drop-off',
                    'arrivalName' => "Gate of {$destName}",
                    'durationMinutes' => 5,
                    'costEstimate' => 20,
                    'instructions' => "Hire local tricycle from drop-off point to gate of {$destName} (~5 mins)",
                ];
                $transitSegments[] = [
                    'id' => 'inter_seg_5',
                    'type' => 'walk',
                    'title' => "Walk to Main Entrance",
                    'departureName' => 'Gate',
                    'arrivalName' => $destName,
                    'durationMinutes' => 2,
                    'costEstimate' => 0,
                    'instructions' => "Walk from gate to main entrance of {$destName} (~2 mins)",
                ];
            }

            $steps = array_map(function($seg, $idx) use ($waypoints) {
                return [
                    'distance' => 100,
                    'duration' => $seg['durationMinutes'] * 60,
                    'name' => ($idx + 1) . ". " . $seg['instructions'],
                    'maneuver' => ['type' => 'transit', 'modifier' => '', 'location' => [$waypoints[0][1], $waypoints[0][0]]],
                ];
            }, $transitSegments, array_keys($transitSegments));

            $steps[] = [
                'distance' => 0,
                'duration' => 0,
                'name' => (count($steps) + 1) . ". Arrive at {$destName}",
                'maneuver' => ['type' => 'arrive', 'modifier' => '', 'location' => [$waypoints[count($waypoints)-1][1], $waypoints[count($waypoints)-1][0]]],
            ];
        } elseif ($distKm < 70) {
            // Category 4: Regional Provincial Commute (25 km to 70 km, e.g. Domanpot 60.1 km)
            $totalMins = max(30, (int)round($duration / 60));
            $leg2Mins = max(20, (int)round($totalMins * 0.65));
            $leg3Mins = max(12, (int)round($totalMins * 0.25));

            $busDist = round($distKm * 0.75, 1);
            $secDist = round($distKm * 0.2, 1);

            $transitSegments = [
                [
                    'id' => 'reg_seg_1',
                    'type' => $firstLegType,
                    'title' => $firstLegTitle,
                    'departureName' => $originName,
                    'arrivalName' => "{$primaryRoad} Highway Terminal",
                    'durationMinutes' => $firstLegMins,
                    'costEstimate' => $firstLegCost,
                    'instructions' => $firstLegInstr,
                ],
                [
                    'id' => 'reg_seg_2',
                    'type' => 'bus',
                    'title' => "Regional Express Bus via {$primaryRoad} (~{$busDist} km)",
                    'departureName' => "{$primaryRoad} Terminal",
                    'arrivalName' => "Interchange Junction ({$secRoad})",
                    'durationMinutes' => $leg2Mins,
                    'costEstimate' => (int)round($busDist * 2.2),
                    'instructions' => "Board regional express bus via {$primaryRoad} to {$secRoad} interchange junction (~{$busDist} km, ~" . round($leg2Mins / 60, 1) . " hrs)",
                ],
                [
                    'id' => 'reg_seg_3',
                    'type' => 'jeepney',
                    'title' => "Inter-Town Jeepney along {$secRoad} (~{$secDist} km)",
                    'departureName' => "{$secRoad} Junction",
                    'arrivalName' => "Drop-off near {$destName}",
                    'durationMinutes' => $leg3Mins,
                    'costEstimate' => 35,
                    'instructions' => "Transfer to inter-town jeepney along {$secRoad} heading towards town proper near {$destName} (~{$secDist} km, ~{$leg3Mins} mins)",
                ]
            ];

            if ($isNearDestHighway) {
                $transitSegments[] = [
                    'id' => 'reg_seg_4',
                    'type' => 'walk',
                    'title' => "Walk to Entrance of {$destName}",
                    'departureName' => 'Drop-off point',
                    'arrivalName' => $destName,
                    'durationMinutes' => 2,
                    'costEstimate' => 0,
                    'instructions' => "Alight at drop-off point and walk to main entrance of {$destName} (~2 mins)",
                ];
            } else {
                $transitSegments[] = [
                    'id' => 'reg_seg_4',
                    'type' => 'tricycle',
                    'title' => "Local Town Tricycle to Gate of {$destName}",
                    'departureName' => 'Drop-off Point',
                    'arrivalName' => "Gate of {$destName}",
                    'durationMinutes' => 5,
                    'costEstimate' => 25,
                    'instructions' => "Hire local town tricycle from drop-off point to gate of {$destName} (~5 mins)",
                ];
                $transitSegments[] = [
                    'id' => 'reg_seg_5',
                    'type' => 'walk',
                    'title' => "Walk to Main Entrance of {$destName}",
                    'departureName' => 'Gate',
                    'arrivalName' => $destName,
                    'durationMinutes' => 2,
                    'costEstimate' => 0,
                    'instructions' => "Alight at gate and walk to main entrance of {$destName} (~2 mins)",
                ];
            }

            $steps = array_map(function($seg, $idx) use ($waypoints) {
                return [
                    'distance' => 100,
                    'duration' => $seg['durationMinutes'] * 60,
                    'name' => ($idx + 1) . ". " . $seg['instructions'],
                    'maneuver' => ['type' => 'transit', 'modifier' => '', 'location' => [$waypoints[0][1], $waypoints[0][0]]],
                ];
            }, $transitSegments, array_keys($transitSegments));

            $steps[] = [
                'distance' => 0,
                'duration' => 0,
                'name' => (count($steps) + 1) . ". Arrive at {$destName}",
                'maneuver' => ['type' => 'arrive', 'modifier' => '', 'location' => [$waypoints[count($waypoints)-1][1], $waypoints[count($waypoints)-1][0]]],
            ];
        } else {
            // Category 5: Very Long Provincial Commute (> 70 km)
            $totalMins = max(45, (int)round($duration / 60));
            $leg2Mins = max(30, (int)round($totalMins * 0.6));
            $leg3Mins = max(15, (int)round($totalMins * 0.25));
            $leg4Mins = max(10, (int)round($totalMins * 0.1));

            $leg2Km = round($distKm * 0.65, 1);
            $leg3Km = round($distKm * 0.25, 1);
            $leg4Km = round($distKm * 0.08, 1);

            $transitSegments = [
                [
                    'id' => 'vlong_seg_1',
                    'type' => $firstLegType,
                    'title' => $firstLegTitle,
                    'departureName' => $originName,
                    'arrivalName' => "{$primaryRoad} Central Terminal",
                    'durationMinutes' => $firstLegMins,
                    'costEstimate' => $firstLegCost,
                    'instructions' => $firstLegInstr,
                ],
                [
                    'id' => 'vlong_seg_2',
                    'type' => 'bus',
                    'title' => "Regional Express Bus via {$primaryRoad} (~{$leg2Km} km)",
                    'departureName' => "{$primaryRoad} Central Terminal",
                    'arrivalName' => 'Regional Interchange Terminal',
                    'durationMinutes' => $leg2Mins,
                    'costEstimate' => (int)round($leg2Km * 2.2),
                    'instructions' => "Board regional express bus via {$primaryRoad} to regional interchange terminal (~{$leg2Km} km, ~" . round($leg2Mins / 60, 1) . " hrs)",
                ],
                [
                    'id' => 'vlong_seg_3',
                    'type' => 'bus',
                    'title' => "Provincial Feeder Bus / UV Express (~{$leg3Km} km)",
                    'departureName' => 'Interchange Terminal',
                    'arrivalName' => "District Terminal ({$secRoad})",
                    'durationMinutes' => $leg3Mins,
                    'costEstimate' => 65,
                    'instructions' => "Transfer to provincial feeder bus or UV Express along {$secRoad} to district terminal (~{$leg3Km} km, ~{$leg3Mins} mins)",
                ],
                [
                    'id' => 'vlong_seg_4',
                    'type' => 'jeepney',
                    'title' => "Local Town Jeepney via {$tertiaryRoad} (~{$leg4Km} km)",
                    'departureName' => 'District Terminal',
                    'arrivalName' => "Town Proper Junction near {$destName}",
                    'durationMinutes' => $leg4Mins,
                    'costEstimate' => 25,
                    'instructions' => "Board local town jeepney via {$tertiaryRoad} towards {$destName} sector (~{$leg4Km} km, ~{$leg4Mins} mins)",
                ]
            ];

            if ($isNearDestHighway) {
                $transitSegments[] = [
                    'id' => 'vlong_seg_5',
                    'type' => 'walk',
                    'title' => "Walk to Entrance of {$destName}",
                    'departureName' => 'Town Proper Junction',
                    'arrivalName' => $destName,
                    'durationMinutes' => 2,
                    'costEstimate' => 0,
                    'instructions' => "Alight at town proper junction and walk to main entrance of {$destName} (~2 mins)",
                ];
            } else {
                $transitSegments[] = [
                    'id' => 'vlong_seg_5',
                    'type' => 'tricycle',
                    'title' => "Special Tricycle Ride to Gate of {$destName}",
                    'departureName' => 'Town Proper Junction',
                    'arrivalName' => "Gate of {$destName}",
                    'durationMinutes' => 5,
                    'costEstimate' => 30,
                    'instructions' => "Hire local tricycle from town proper junction directly to {$destName} gate (~5 mins)",
                ];
                $transitSegments[] = [
                    'id' => 'vlong_seg_6',
                    'type' => 'walk',
                    'title' => "Walk to Main Entrance of {$destName}",
                    'departureName' => 'Gate',
                    'arrivalName' => $destName,
                    'durationMinutes' => 2,
                    'costEstimate' => 0,
                    'instructions' => "Walk from gate to main entrance of {$destName} (~2 mins)",
                ];
            }

            $steps = array_map(function($seg, $idx) use ($waypoints) {
                return [
                    'distance' => 100,
                    'duration' => $seg['durationMinutes'] * 60,
                    'name' => ($idx + 1) . ". " . $seg['instructions'],
                    'maneuver' => ['type' => 'transit', 'modifier' => '', 'location' => [$waypoints[0][1], $waypoints[0][0]]],
                ];
            }, $transitSegments, array_keys($transitSegments));

            $steps[] = [
                'distance' => 0,
                'duration' => 0,
                'name' => (count($steps) + 1) . ". Arrive at {$destName}",
                'maneuver' => ['type' => 'arrive', 'modifier' => '', 'location' => [$waypoints[count($waypoints)-1][1], $waypoints[count($waypoints)-1][0]]],
            ];

            $numSegs = count($transitSegments);
            $totalCoords = count($flatCoords);
            $stops = [];

            foreach ($transitSegments as $idx => $seg) {
                $coordIndex = (int)round(($idx / max(1, $numSegs)) * max(0, $totalCoords - 1));
                $pt = $flatCoords[$coordIndex] ?? [$waypoints[0][1], $waypoints[0][0]];

                $stops[] = [
                    'id' => "fallback_stop_{$idx}_pickup",
                    'name' => $seg['departureName'] ?: ("Board " . ($seg['title'] ?? 'Transit')),
                    'lat' => (float)$pt[1],
                    'lng' => (float)$pt[0],
                    'type' => $idx === 0 ? 'pickup' : 'transfer',
                    'leg_index' => $idx,
                    'modes' => [$seg['type'] ?? 'transit'],
                    'fare' => (float)($seg['costEstimate'] ?? 0),
                    'duration_minutes' => (int)($seg['durationMinutes'] ?? 5),
                    'instructions' => $seg['instructions'] ?? '',
                ];

                if ($idx === $numSegs - 1) {
                    $lastPt = $flatCoords[max(0, $totalCoords - 1)] ?? [$waypoints[count($waypoints)-1][1], $waypoints[count($waypoints)-1][0]];
                    $stops[] = [
                        'id' => "fallback_stop_{$idx}_dropoff",
                        'name' => $seg['arrivalName'] ?: $destName,
                        'lat' => (float)$lastPt[1],
                        'lng' => (float)$lastPt[0],
                        'type' => 'dropoff',
                        'leg_index' => $idx,
                        'modes' => [$seg['type'] ?? 'transit'],
                        'fare' => (float)($seg['costEstimate'] ?? 0),
                        'duration_minutes' => (int)($seg['durationMinutes'] ?? 5),
                        'instructions' => $seg['instructions'] ?? '',
                    ];
                }
            }

            return [
                'routes' => [[
                    'distance' => $distance,
                    'duration' => $duration,
                    'is_transit' => true,
                    'geometry' => [
                        'coordinates' => $flatCoords
                    ],
                    'legs' => [[
                        'distance' => $distance,
                        'duration' => $duration,
                        'steps' => $steps
                    ]],
                    'transit_segments' => $transitSegments,
                    'stops' => $stops,
                ]]
            ];
        }
    }

    /**
     * Format Google Directions Transit response into standard OSRM format + transit_segments
     */
    protected function formatGoogleTransitResponse($data)
    {
        $route = $data['routes'][0];
        $leg = $route['legs'][0] ?? [];
        $distance = $leg['distance']['value'] ?? 0;
        $duration = $leg['duration']['value'] ?? 0;

        $flatCoords = [];
        $steps = [];
        $transitSegments = [];

        if (isset($route['overview_polyline']['points'])) {
            $flatCoords = $this->decodeGooglePolyline($route['overview_polyline']['points']);
        }

        if (isset($leg['steps'])) {
            foreach ($leg['steps'] as $idx => $step) {
                $stepDist = $step['distance']['value'] ?? 0;
                $stepDur = $step['duration']['value'] ?? 0;
                $instruction = strip_tags($step['html_instructions'] ?? '');
                $travelMode = $step['travel_mode'] ?? 'WALKING';

                $stepLocation = [
                    $step['start_location']['lng'] ?? 0,
                    $step['start_location']['lat'] ?? 0,
                ];

                $steps[] = [
                    'distance' => $stepDist,
                    'duration' => $stepDur,
                    'name' => $instruction,
                    'maneuver' => [
                        'type' => strtolower($travelMode) === 'transit' ? 'transit' : 'turn',
                        'modifier' => '',
                        'location' => $stepLocation,
                    ],
                ];

                if ($travelMode === 'TRANSIT' && isset($step['transit_details'])) {
                    $td = $step['transit_details'];
                    $vehicleType = strtolower($td['line']['vehicle']['type'] ?? 'bus');
                    $mappedType = match ($vehicleType) {
                        'subway', 'heavy_rail', 'commuter_train', 'rail' => 'train',
                        'ferry' => 'ferry',
                        'tram', 'trolleybus' => 'bus',
                        default => 'bus',
                    };

                    $lineName = $td['line']['short_name'] ?? $td['line']['name'] ?? 'Transit Line';
                    $depStop = $td['departure_stop']['name'] ?? 'Departure Stop';
                    $arrStop = $td['arrival_stop']['name'] ?? 'Arrival Stop';
                    $numStops = $td['num_stops'] ?? 1;

                    $transitSegments[] = [
                        'id' => 'google_seg_' . $idx,
                        'type' => $mappedType,
                        'title' => "{$lineName}: {$depStop} → {$arrStop}",
                        'departureName' => $depStop,
                        'arrivalName' => $arrStop,
                        'durationMinutes' => round($stepDur / 60),
                        'distanceKm' => round($stepDist / 1000, 1),
                        'agency' => $td['line']['agencies'][0]['name'] ?? 'Public Transit',
                        'lineName' => $lineName,
                        'instructions' => "Board {$lineName} at {$depStop} ({$numStops} stops, ~" . round($stepDur / 60) . " mins)",
                    ];
                }
            }
        }

        return [
            'routes' => [
                [
                    'distance' => $distance,
                    'duration' => $duration,
                    'geometry' => [
                        'coordinates' => $flatCoords,
                    ],
                    'legs' => [
                        [
                            'distance' => $distance,
                            'duration' => $duration,
                            'steps' => $steps,
                        ],
                    ],
                    'transit_segments' => $transitSegments,
                ],
            ],
        ];
    }

    /**
     * Fetch street-network polyline path between two coordinates via OSRM
     */
    protected function getOsrmStreetPath(float $startLat, float $startLng, float $endLat, float $endLng, string $profile = 'driving'): array
    {
        $d = $this->haversineDistance([$startLat, $startLng], [$endLat, $endLng]);
        if ($d < 10) {
            return [[$startLng, $startLat], [$endLng, $endLat]];
        }

        $url = "{$this->osrmBaseUrl}/route/v1/{$profile}/{$startLng},{$startLat};{$endLng},{$endLat}?overview=full&geometries=geojson";

        try {
            $res = Http::timeout(3)->get($url);
            if ($res->successful() && isset($res['routes'][0]['geometry']['coordinates'])) {
                $coords = $res['routes'][0]['geometry']['coordinates'];
                if (is_array($coords) && count($coords) > 1) {
                    return $coords;
                }
            }
        } catch (\Exception $e) {
            Log::warning("getOsrmStreetPath Exception: " . $e->getMessage());
        }

        return [[$startLng, $startLat], [$endLng, $endLat]];
    }

    /**
     * Decode Google Maps Encoded Polyline algorithm into [lng, lat] coordinates
     */
    protected function decodeGooglePolyline(string $encoded): array
    {
        $length = strlen($encoded);
        $index = 0;
        $points = [];
        $lat = 0;
        $lng = 0;

        while ($index < $length) {
            $b = 0;
            $shift = 0;
            $result = 0;
            do {
                $b = ord($encoded[$index++]) - 63;
                $result |= ($b & 0x1f) << $shift;
                $shift += 5;
            } while ($b >= 0x20);
            $dlat = (($result & 1) ? ~($result >> 1) : ($result >> 1));
            $lat += $dlat;

            $shift = 0;
            $result = 0;
            do {
                $b = ord($encoded[$index++]) - 63;
                $result |= ($b & 0x1f) << $shift;
                $shift += 5;
            } while ($b >= 0x20);
            $dlng = (($result & 1) ? ~($result >> 1) : ($result >> 1));
            $lng += $dlng;

            $points[] = [$lng * 1e-5, $lat * 1e-5];
        }

        return $points;
    }

    /**
     * Calculate perpendicular projection or closest point on line segment
     */
    protected function closestPointOnSegment($p, $a, $b)
    {
        $px = (float)$p[1]; $py = (float)$p[0]; // lng, lat
        $ax = (float)$a[1]; $ay = (float)$a[0];
        $bx = (float)$b[1]; $by = (float)$b[0];

        $dx = $bx - $ax;
        $dy = $by - $ay;

        if ($dx == 0 && $dy == 0) {
            return [$a[0], $a[1]];
        }

        $t = (($px - $ax) * $dx + ($py - $ay) * $dy) / ($dx * $dx + $dy * $dy);
        $t = max(0, min(1, $t));

        $closestLng = $ax + $t * $dx;
        $closestLat = $ay + $t * $dy;

        return [$closestLat, $closestLng];
    }

    /**
     * Find nearest point along route polyline
     */
    protected function findNearestPointOnCorridor($point, $flatCoords)
    {
        if (empty($flatCoords)) {
            return ['point' => $point, 'distance_m' => 0, 'index' => 0];
        }

        $minDist = PHP_INT_MAX;
        $bestPoint = $point;
        $bestIdx = 0;

        for ($i = 0; $i < count($flatCoords) - 1; $i++) {
            $a = [(float)$flatCoords[$i][1], (float)$flatCoords[$i][0]]; // [lat, lng]
            $b = [(float)$flatCoords[$i+1][1], (float)$flatCoords[$i+1][0]];
            $closest = $this->closestPointOnSegment($point, $a, $b);
            $dist = $this->haversineDistance($point, $closest);

            if ($dist < $minDist) {
                $minDist = $dist;
                $bestPoint = $closest;
                $bestIdx = $i;
            }
        }

        return [
            'point' => $bestPoint,
            'distance_m' => $minDist,
            'index' => $bestIdx
        ];
    }



    /**
     * Normalize coordinate array to GeoJSON [lng, lat] format
     */
    protected function normalizeLngLat(array $pt): array
    {
        $a = (float) $pt[0];
        $b = (float) $pt[1];
        if (abs($a) <= 90 && abs($b) > 90) {
            // $a is latitude, $b is longitude -> return [lng, lat]
            return [$b, $a];
        }
        // Already [lng, lat]
        return [$a, $b];
    }

    /**
     * Calculate hybrid public commute using Admin-plotted transit routes + local access & egress legs.
     */
    protected function calculateAdminHybridTransitRoute($waypoints, $originName = 'Your Starting Location', $destName = 'Destination')
    {
        if (count($waypoints) < 2) return null;

        $startLat = (float) $waypoints[0][0];
        $startLng = (float) $waypoints[0][1];
        $endLat = (float) $waypoints[count($waypoints) - 1][0];
        $endLng = (float) $waypoints[count($waypoints) - 1][1];

        $routes = \App\Models\AdminTransitRoute::with('legs')->get();
        if ($routes->isEmpty()) return null;

        $bestRoute = null;
        $bestScore = PHP_INT_MAX;

        foreach ($routes as $route) {
            if ($route->legs->isEmpty()) continue;

            $firstLeg = $route->legs->first();
            $lastLeg = $route->legs->last();

            $dStartKm = $this->haversineDistance([$startLat, $startLng], [(float)$firstLeg->start_lat, (float)$firstLeg->start_lng]) / 1000;
            $dEndKm = $this->haversineDistance([(float)$lastLeg->end_lat, (float)$lastLeg->end_lng], [$endLat, $endLng]) / 1000;

            if ($dStartKm <= 100.0 && $dEndKm <= 100.0) {
                $score = $dStartKm + $dEndKm;
                if ($score < $bestScore) {
                    $bestScore = $score;
                    $bestRoute = $route;
                }
            }
        }

        if (!$bestRoute) return null;

        // Build continuous route corridor coordinates & ensure road geometry exists for every leg
        $routePolyline = [];
        $stops = [];

        foreach ($bestRoute->legs as $lIdx => $leg) {
            $lCoords = [];
            if (!empty($leg->path_coordinates)) {
                $raw = is_array($leg->path_coordinates) ? $leg->path_coordinates : json_decode($leg->path_coordinates, true);
                if (is_array($raw) && count($raw) > 1) {
                    foreach ($raw as $pt) {
                        if (is_array($pt) && count($pt) >= 2) {
                            $lCoords[] = $this->normalizeLngLat($pt);
                        }
                    }
                }
            }

            // Fallback OSRM street fetch if path_coordinates empty
            if (count($lCoords) < 2) {
                $lCoords = $this->getOsrmStreetPath((float)$leg->start_lat, (float)$leg->start_lng, (float)$leg->end_lat, (float)$leg->end_lng, $leg->mode === 'walk' ? 'foot' : 'driving');
            }

            foreach ($lCoords as $pt) {
                $routePolyline[] = $this->normalizeLngLat($pt);
            }

            $modesList = [];
            if (!empty($leg->mode)) {
                $modesList = array_map('trim', explode('/', $leg->mode));
            }

            $pickupName = ($lIdx === 0 && !empty($bestRoute->origin_name))
                ? $bestRoute->origin_name
                : (!empty($leg->route_name) ? "{$leg->route_name} Loading Stop" : "Pickup Stop #" . ($lIdx + 1));

            $dropoffName = ($lIdx === count($bestRoute->legs) - 1 && !empty($bestRoute->dest_name))
                ? $bestRoute->dest_name
                : (!empty($leg->route_name) ? "{$leg->route_name} Drop-off Terminal" : "Drop-off Stop #" . ($lIdx + 1));

            $stops[] = [
                'id' => "stop_{$lIdx}_pickup",
                'name' => $pickupName,
                'place_name' => $pickupName,
                'address' => "{$leg->start_lat}, {$leg->start_lng}",
                'vicinity' => !empty($bestRoute->origin_name) ? $bestRoute->origin_name : "Loading Stop Area",
                'category' => "Pickup Terminal",
                'lat' => (float)$leg->start_lat,
                'lng' => (float)$leg->start_lng,
                'type' => 'pickup',
                'leg_index' => $lIdx,
                'modes' => $modesList,
                'fare' => (float)$leg->fare,
                'duration_minutes' => (int)$leg->duration_minutes,
                'instructions' => $leg->instructions ?: "Board {$leg->mode} at {$pickupName}",
            ];

            if ($lIdx === count($bestRoute->legs) - 1) {
                $stops[] = [
                    'id' => "stop_{$lIdx}_dropoff",
                    'name' => $dropoffName,
                    'place_name' => $dropoffName,
                    'address' => "{$leg->end_lat}, {$leg->end_lng}",
                    'vicinity' => !empty($bestRoute->dest_name) ? $bestRoute->dest_name : "Drop-off Terminal Area",
                    'category' => "Drop-off Terminal",
                    'lat' => (float)$leg->end_lat,
                    'lng' => (float)$leg->end_lng,
                    'type' => 'dropoff',
                    'leg_index' => $lIdx,
                    'modes' => $modesList,
                    'fare' => (float)$leg->fare,
                    'duration_minutes' => (int)$leg->duration_minutes,
                    'instructions' => "Alight at {$dropoffName}",
                ];
            }
        }

        // Project user start onto corridor polyline for roadside pickup
        $nearestStart = $this->findNearestPointOnCorridor([$startLat, $startLng], $routePolyline);

        $boardLat = $nearestStart['point'][0];
        $boardLng = $nearestStart['point'][1];
        $boardDistM = $nearestStart['distance_m'];

        // Alighting Point: ALWAYS the exact Admin Drop-off Terminal / Stop coordinates
        $lastLeg = $bestRoute->legs->last();
        $adminDropOffLat = (float)$lastLeg->end_lat;
        $adminDropOffLng = (float)$lastLeg->end_lng;
        $adminDropOffName = $dropoffName;

        $alightLat = $adminDropOffLat;
        $alightLng = $adminDropOffLng;
        $alightDistM = $this->haversineDistance([$endLat, $endLng], [$adminDropOffLat, $adminDropOffLng]);
        $alightStopName = $adminDropOffName;

        // Build Hybrid Segments & Steps
        $transitSegments = [];
        $steps = [];
        $flatCoords = [];
        $totalDuration = 0;
        $totalFare = (float) $bestRoute->total_fare;

        // 1. Initial Access Leg (Street-Network Routing to Boarding Point)
        $accessIsWalk = $boardDistM < 400;
        $accessType = $accessIsWalk ? 'walk' : 'tricycle';
        $accessMins = max(1, (int)round($boardDistM / ($accessIsWalk ? 80 : 250)));
        $accessFare = $accessIsWalk ? 0 : 25;
        $accessTitle = $accessIsWalk ? "Walk to Roadside Loading Stop" : "Local Ride to Highway Loading Area";
        
        $accessInstr = $accessIsWalk
            ? ($boardDistM < 80 
                ? "Walk to nearest loading stop along highway (~1 min)" 
                : "Walk from {$originName} to highway loading point (~" . round($boardDistM) . "m, ~{$accessMins} mins)")
            : "Ride local tricycle from {$originName} to highway loading area (~" . round($boardDistM / 1000, 1) . "km, ~{$accessMins} mins)";

        $totalDuration += $accessMins * 60;
        $totalFare += $accessFare;

        // Fetch OSRM street path from user GPS to boarding point
        $accessStreetCoords = $this->getOsrmStreetPath($startLat, $startLng, $boardLat, $boardLng, $accessIsWalk ? 'foot' : 'driving');
        foreach ($accessStreetCoords as $pt) {
            $flatCoords[] = $pt;
        }

        $transitSegments[] = [
            'id' => 'access_seg_1',
            'type' => $accessType,
            'title' => $accessTitle,
            'departureName' => $originName,
            'arrivalName' => !empty($bestRoute->origin_name) ? $bestRoute->origin_name : "Highway Loading Stop",
            'durationMinutes' => $accessMins,
            'costEstimate' => $accessFare,
            'instructions' => $accessInstr,
        ];

        $steps[] = [
            'distance' => round($boardDistM),
            'duration' => $accessMins * 60,
            'name' => "1. " . $accessInstr,
            'maneuver' => ['type' => 'depart', 'modifier' => '', 'location' => [$startLng, $startLat]],
        ];

        // 2. Main Transit Polyline (Follows corridor from Boarding Point to Admin Drop-off Terminal)
        $startIndex = $nearestStart['index'];
        for ($i = $startIndex; $i < count($routePolyline); $i++) {
            $flatCoords[] = $routePolyline[$i];
        }

        $stepCounter = 2;
        foreach ($bestRoute->legs as $legIdx => $leg) {
            $legMins = max(1, $leg->duration_minutes);
            $totalDuration += $legMins * 60;
            $mode = strtolower($leg->mode);

            $legDepName = ($legIdx === 0 && !empty($bestRoute->origin_name)) ? $bestRoute->origin_name : "Highway Stop";
            $legArrName = ($legIdx === count($bestRoute->legs) - 1 && !empty($bestRoute->dest_name)) ? $bestRoute->dest_name : "Drop-off Terminal";
            $legInstr = $leg->instructions ?: "Board {$leg->mode} ({$leg->route_name}) from {$legDepName} to {$legArrName}";

            $transitSegments[] = [
                'id' => "admin_leg_{$leg->id}",
                'type' => $mode,
                'title' => "{$leg->route_name} ({$leg->mode})",
                'departureName' => $legDepName,
                'arrivalName' => $legArrName,
                'durationMinutes' => $legMins,
                'costEstimate' => (float)$leg->fare,
                'instructions' => $legInstr,
            ];

            $steps[] = [
                'distance' => 500,
                'duration' => $legMins * 60,
                'name' => "{$stepCounter}. " . $legInstr . " (Fare: ₱" . number_format((float)$leg->fare, 2) . ")",
                'maneuver' => ['type' => 'transit', 'modifier' => '', 'location' => [(float)$leg->start_lng, (float)$leg->start_lat]],
            ];
            $stepCounter++;
        }

        // 3. Final Egress Leg (Street-Network Routing)
        $egressIsWalk = $alightDistM < 300;
        $egressType = $egressIsWalk ? 'walk' : 'tricycle';
        $egressMins = max(1, (int)round($alightDistM / ($egressIsWalk ? 80 : 250)));
        $egressFare = $egressIsWalk ? 0 : 20;
        $egressTitle = $egressIsWalk ? "Walk to {$destName}" : "Local Tricycle to {$destName}";
        $egressInstr = $egressIsWalk
            ? "Alight at {$alightStopName} and walk to {$destName} (~" . round($alightDistM) . "m, ~{$egressMins} mins)"
            : "Alight at {$alightStopName} and hire local tricycle to {$destName} (~" . round($alightDistM / 1000, 1) . "km, ~{$egressMins} mins)";

        $totalDuration += $egressMins * 60;
        $totalFare += $egressFare;

        $egressStreetCoords = $this->getOsrmStreetPath($alightLat, $alightLng, $endLat, $endLng, $egressIsWalk ? 'foot' : 'driving');
        foreach ($egressStreetCoords as $pt) {
            $flatCoords[] = $pt;
        }

        $transitSegments[] = [
            'id' => 'egress_seg_1',
            'type' => $egressType,
            'title' => $egressTitle,
            'departureName' => $alightStopName,
            'arrivalName' => $destName,
            'durationMinutes' => $egressMins,
            'costEstimate' => $egressFare,
            'instructions' => $egressInstr,
        ];

        $steps[] = [
            'distance' => round($alightDistM),
            'duration' => $egressMins * 60,
            'name' => "{$stepCounter}. " . $egressInstr,
            'maneuver' => ['type' => 'transit', 'modifier' => '', 'location' => [$alightLng, $alightLat]],
        ];
        $stepCounter++;

        $steps[] = [
            'distance' => 0,
            'duration' => 0,
            'name' => "{$stepCounter}. Arrive at {$destName}",
            'maneuver' => ['type' => 'arrive', 'modifier' => '', 'location' => [$endLng, $endLat]],
        ];

        $totalDistance = 0;
        for ($i = 0; $i < count($flatCoords) - 1; $i++) {
            $totalDistance += $this->haversineDistance([$flatCoords[$i][1], $flatCoords[$i][0]], [$flatCoords[$i+1][1], $flatCoords[$i+1][0]]);
        }

        return [
            'routes' => [
                [
                    'distance' => $totalDistance,
                    'duration' => $totalDuration,
                    'is_admin_route' => true,
                    'admin_title' => $bestRoute->title,
                    'total_fare' => $totalFare,
                    'transit_segments' => $transitSegments,
                    'stops' => $stops,
                    'geometry' => [
                        'coordinates' => $flatCoords,
                    ],
                    'legs' => [
                        [
                            'distance' => $totalDistance,
                            'duration' => $totalDuration,
                            'steps' => $steps,
                        ]
                    ]
                ]
            ]
        ];
    }

    /**
     * Network Graph Router (Dijkstra algorithm over admin-plotted TransitStops and TransitConnections)
     */
    public function calculateNetworkTransitRoute(array $waypoints, string $originName = 'Start', string $destName = 'Destination'): ?array
    {
        if (count($waypoints) < 2) {
            return null;
        }

        $originLat = (float) $waypoints[0][0];
        $originLng = (float) $waypoints[0][1];
        $destLat = (float) $waypoints[count($waypoints) - 1][0];
        $destLng = (float) $waypoints[count($waypoints) - 1][1];

        $stops = TransitStop::all();
        if ($stops->count() < 2) {
            return null;
        }

        // Find closest start stop and end stop
        $startStop = null;
        $minStartDist = PHP_FLOAT_MAX;

        $endStop = null;
        $minEndDist = PHP_FLOAT_MAX;

        foreach ($stops as $stop) {
            $dStart = $this->haversineDistance([$originLat, $originLng], [(float)$stop->latitude, (float)$stop->longitude]);
            if ($dStart < $minStartDist) {
                $minStartDist = $dStart;
                $startStop = $stop;
            }

            $dEnd = $this->haversineDistance([$destLat, $destLng], [(float)$stop->latitude, (float)$stop->longitude]);
            if ($dEnd < $minEndDist) {
                $minEndDist = $dEnd;
                $endStop = $stop;
            }
        }

        if (!$startStop || !$endStop) {
            return null;
        }

        // Fetch connections
        $connections = TransitConnection::all();
        $graph = [];

        foreach ($connections as $conn) {
            $u = (int) $conn->from_stop_id;
            $v = (int) $conn->to_stop_id;
            $weight = max(1, (int) ($conn->duration_minutes ?? round($conn->distance_meters / 300)));

            $graph[$u][] = [
                'to' => $v,
                'weight' => $weight,
                'connection' => $conn,
                'direction' => 'forward'
            ];

            if ($conn->is_bidirectional) {
                $graph[$v][] = [
                    'to' => $u,
                    'weight' => $weight,
                    'connection' => $conn,
                    'direction' => 'reverse'
                ];
            }
        }

        // Dijkstra algorithm
        $startId = (int) $startStop->id;
        $targetId = (int) $endStop->id;

        $pathEdges = [];

        if ($startId !== $targetId) {
            $dist = [];
            $prev = [];
            $unvisited = [];

            foreach ($stops as $stop) {
                $sId = (int) $stop->id;
                $dist[$sId] = INF;
                $prev[$sId] = null;
                $unvisited[$sId] = true;
            }

            $dist[$startId] = 0;

            while (!empty($unvisited)) {
                $minNode = null;
                $minDist = INF;
                foreach ($unvisited as $nodeId => $true) {
                    if ($dist[$nodeId] < $minDist) {
                        $minDist = $dist[$nodeId];
                        $minNode = $nodeId;
                    }
                }

                if ($minNode === null || $minDist === INF) break;
                if ($minNode === $targetId) break;

                unset($unvisited[$minNode]);

                if (isset($graph[$minNode])) {
                    foreach ($graph[$minNode] as $edge) {
                        $neighbor = $edge['to'];
                        if (!isset($unvisited[$neighbor])) continue;

                        $alt = $dist[$minNode] + $edge['weight'];
                        if ($alt < $dist[$neighbor]) {
                            $dist[$neighbor] = $alt;
                            $prev[$neighbor] = [
                                'node' => $minNode,
                                'edge' => $edge
                            ];
                        }
                    }
                }
            }

            if ($dist[$targetId] !== INF && isset($prev[$targetId])) {
                $curr = $targetId;
                while (isset($prev[$curr])) {
                    $p = $prev[$curr];
                    array_unshift($pathEdges, $p['edge']);
                    $curr = $p['node'];
                }
            }
        }

        // If no explicit connection edge in DB graph, generate road-snapped direct connection between stops
        if (empty($pathEdges) && $startId !== $targetId) {
            $dMeters = $this->haversineDistance([(float)$startStop->latitude, (float)$startStop->longitude], [(float)$endStop->latitude, (float)$endStop->longitude]);
            $durMins = max(2, (int) round($dMeters / 350));
            $synConn = new TransitConnection([
                'id' => 999000 + $startId,
                'from_stop_id' => $startStop->id,
                'to_stop_id' => $endStop->id,
                'mode' => 'jeepney',
                'route_name' => "{$startStop->name} to {$endStop->name}",
                'fare' => max(13, round(($dMeters / 1000) * 1.8)),
                'duration_minutes' => $durMins,
                'distance_meters' => (int) $dMeters,
                'is_bidirectional' => true,
            ]);

            $pathEdges = [[
                'to' => $endStop->id,
                'weight' => $durMins,
                'connection' => $synConn,
                'direction' => 'forward'
            ]];
        }

        $stopsMap = $stops->keyBy('id');

        // Build combined transit corridor geometry from path edges first
        $transitCorridorPolyline = [];
        foreach ($pathEdges as $edge) {
            $conn = $edge['connection'];
            $dir = $edge['direction'];
            $fromStop = $dir === 'forward' ? $stopsMap[$conn->from_stop_id] : $stopsMap[$conn->to_stop_id];
            $toStop = $dir === 'forward' ? $stopsMap[$conn->to_stop_id] : $stopsMap[$conn->from_stop_id];

            $edgeRoadCoords = [];
            $rawPath = $conn->path_coordinates ?? $conn->polyline_geometry;

            if (!empty($rawPath)) {
                $geom = is_array($rawPath) ? $rawPath : json_decode($rawPath, true);
                if (is_array($geom) && count($geom) > 1) {
                    if ($dir === 'reverse') {
                        $geom = array_reverse($geom);
                    }
                    foreach ($geom as $pt) {
                        if (isset($pt[0]) && isset($pt[1])) {
                            $edgeRoadCoords[] = [(float)$pt[0], (float)$pt[1]];
                        }
                    }
                }
            }

            if (count($edgeRoadCoords) < 2) {
                $edgeRoadCoords = $this->getRoadGeometryBetweenPoints(
                    [(float)$fromStop->latitude, (float)$fromStop->longitude],
                    [(float)$toStop->latitude, (float)$toStop->longitude],
                    $conn->mode
                );
                try { $conn->update(['path_coordinates' => $edgeRoadCoords]); } catch (\Throwable $e) {}
            }

            foreach ($edgeRoadCoords as $pt) {
                $transitCorridorPolyline[] = [(float)$pt[0], (float)$pt[1]];
            }
        }

        // Build route response structures
        $flatCoords = [];
        $transitSegments = [];
        $routeStops = [];
        $steps = [];
        $stepCounter = 1;
        $totalFare = 0;
        $totalDuration = 0;

        // Project origin onto highway transit corridor to prevent backtracking to a terminal behind user
        $nearestStart = $this->findNearestPointOnCorridor([$originLat, $originLng], $transitCorridorPolyline);
        $boardLat = (float) $nearestStart['point'][0];
        $boardLng = (float) $nearestStart['point'][1];
        $boardDistM = (float) $nearestStart['distance_m'];
        $startIndex = (int) $nearestStart['index'];

        $useRoadsidePickup = ($boardDistM < $minStartDist) || ($boardDistM < 800);

        if ($useRoadsidePickup) {
            $ingressDistM = $boardDistM;
            $ingressTargetLat = $boardLat;
            $ingressTargetLng = $boardLng;
            $ingressTargetName = "Highway Loading Point";
        } else {
            $ingressDistM = $minStartDist;
            $ingressTargetLat = (float) $startStop->latitude;
            $ingressTargetLng = (float) $startStop->longitude;
            $ingressTargetName = $startStop->name;
        }

        $ingressMins = max(1, (int) round($ingressDistM / 80));
        $totalDuration += $ingressMins;

        // Ingress Walk / Access geometry: Origin -> Boarding Point
        $ingressRoadCoords = $this->getRoadGeometryBetweenPoints(
            [$originLat, $originLng],
            [$ingressTargetLat, $ingressTargetLng],
            'walk'
        );
        foreach ($ingressRoadCoords as $pt) {
            $flatCoords[] = [(float)$pt[0], (float)$pt[1]];
        }

        $routeStops[] = [
            'id' => 'origin',
            'name' => $originName,
            'type' => 'origin',
            'latitude' => $originLat,
            'longitude' => $originLng,
        ];
        $routeStops[] = [
            'id' => (string) $startStop->id,
            'name' => $ingressTargetName,
            'type' => 'pickup',
            'latitude' => $ingressTargetLat,
            'longitude' => $ingressTargetLng,
            'city' => $startStop->city,
        ];

        $ingressIsWalk = $ingressDistM < 600;
        $ingressInstr = $ingressIsWalk
            ? ($ingressDistM < 80 
                ? "Walk to nearest roadside loading point (~1 min) and flag down (para) passing transport"
                : "Walk to nearest roadside loading point along highway (~" . round($ingressDistM) . "m, ~{$ingressMins} mins) and flag down (para) passing transport")
            : "Ride local tricycle to highway loading area (~" . round($ingressDistM / 1000, 1) . "km, ~{$ingressMins} mins) to flag down passing transport";

        $transitSegments[] = [
            'id' => 'seg-ingress',
            'mode' => $ingressIsWalk ? 'walk' : 'tricycle',
            'title' => $ingressIsWalk ? "Walk to Roadside Loading Point" : "Local Ride to Highway Loading Area",
            'departureName' => $originName,
            'arrivalName' => $ingressTargetName,
            'durationMinutes' => $ingressMins,
            'costEstimate' => $ingressIsWalk ? 0 : 25,
            'instructions' => $ingressInstr,
        ];
        $steps[] = [
            'distance' => round($ingressDistM),
            'duration' => $ingressMins * 60,
            'name' => "{$stepCounter}. {$ingressInstr}",
            'maneuver' => ['type' => 'walk', 'modifier' => '', 'location' => [$originLng, $originLat]],
        ];
        $stepCounter++;

        // Add transit corridor geometry starting from the boarding point index forward (NO BACKTRACKING!)
        if ($useRoadsidePickup && $startIndex < count($transitCorridorPolyline)) {
            for ($i = $startIndex; $i < count($transitCorridorPolyline); $i++) {
                $flatCoords[] = $transitCorridorPolyline[$i];
            }
        } else {
            foreach ($transitCorridorPolyline as $pt) {
                $flatCoords[] = $pt;
            }
        }

        // Edge Segments (From Stop -> To Stop)
        foreach ($pathEdges as $idx => $edge) {
            $conn = $edge['connection'];
            $dir = $edge['direction'];

            $fromStop = $dir === 'forward' ? $stopsMap[$conn->from_stop_id] : $stopsMap[$conn->to_stop_id];
            $toStop = $dir === 'forward' ? $stopsMap[$conn->to_stop_id] : $stopsMap[$conn->from_stop_id];

            $durMins = max(1, (int) ($conn->duration_minutes ?? round($conn->distance_meters / 300)));
            $fare = (float) ($conn->fare ?? 0);

            $totalDuration += $durMins;
            $totalFare += $fare;

            $routeStops[] = [
                'id' => (string) $toStop->id,
                'name' => $toStop->name,
                'type' => $toStop->type,
                'latitude' => (float)$toStop->latitude,
                'longitude' => (float)$toStop->longitude,
                'city' => $toStop->city,
            ];

            $modeName = ucfirst($conn->mode);
            $routeLabel = $conn->route_name ? " ({$conn->route_name})" : "";
            $instr = "Flag down & Board {$modeName}{$routeLabel} from {$ingressTargetName} to {$toStop->name} (₱" . number_format($fare, 2) . ")";

            $transitSegments[] = [
                'id' => "seg-{$conn->id}-{$idx}",
                'mode' => $conn->mode,
                'route_name' => $conn->route_name,
                'title' => "{$modeName}{$routeLabel}",
                'departureName' => $ingressTargetName,
                'arrivalName' => $toStop->name,
                'durationMinutes' => $durMins,
                'costEstimate' => $fare,
                'instructions' => $instr,
                'from_stop' => [
                    'name' => $ingressTargetName,
                    'lat' => (float) $ingressTargetLat,
                    'lng' => (float) $ingressTargetLng,
                ],
                'to_stop' => [
                    'name' => $toStop->name,
                    'lat' => (float) $toStop->latitude,
                    'lng' => (float) $toStop->longitude,
                ]
            ];

            $steps[] = [
                'distance' => (int) $conn->distance_meters,
                'duration' => $durMins * 60,
                'name' => "{$stepCounter}. {$instr}",
                'maneuver' => ['type' => 'transit', 'modifier' => '', 'location' => [(float)$ingressTargetLng, (float)$ingressTargetLat]],
            ];
            $stepCounter++;
        }

        // Egress Walk / Ride (End Stop -> Destination)
        $egressDistM = $minEndDist;
        $egressMins = max(1, (int) round($egressDistM / 80));
        $totalDuration += $egressMins;

        $egressRoadCoords = $this->getRoadGeometryBetweenPoints(
            [(float)$endStop->latitude, (float)$endStop->longitude],
            [$destLat, $destLng],
            'walk'
        );
        foreach ($egressRoadCoords as $pt) {
            $flatCoords[] = [(float)$pt[0], (float)$pt[1]];
        }

        $routeStops[] = [
            'id' => 'destination',
            'name' => $destName,
            'type' => 'destination',
            'latitude' => $destLat,
            'longitude' => $destLng,
        ];

        $egressIsWalk = $egressDistM < 500;
        $egressInstr = $egressIsWalk
            ? "Alight at {$endStop->name} (para) and walk to {$destName} (~" . round($egressDistM) . "m, ~{$egressMins} mins)"
            : "Alight at {$endStop->name} (para) and hire local tricycle to {$destName} (~" . round($egressDistM / 1000, 1) . "km, ~{$egressMins} mins)";

        $transitSegments[] = [
            'id' => 'seg-egress',
            'mode' => $egressIsWalk ? 'walk' : 'tricycle',
            'title' => $egressIsWalk ? "Walk to destination" : "Tricycle to destination",
            'departureName' => $endStop->name,
            'arrivalName' => $destName,
            'durationMinutes' => $egressMins,
            'costEstimate' => $egressIsWalk ? 0 : 20,
            'instructions' => $egressInstr,
        ];
        $steps[] = [
            'distance' => round($egressDistM),
            'duration' => $egressMins * 60,
            'name' => "{$stepCounter}. {$egressInstr}",
            'maneuver' => ['type' => 'walk', 'modifier' => '', 'location' => [(float)$endStop->longitude, (float)$endStop->latitude]],
        ];
        $stepCounter++;

        $steps[] = [
            'distance' => 0,
            'duration' => 0,
            'name' => "{$stepCounter}. Arrive at {$destName}",
            'maneuver' => ['type' => 'arrive', 'modifier' => '', 'location' => [$destLng, $destLat]],
        ];

        $totalDistance = 0;
        for ($i = 0; $i < count($flatCoords) - 1; $i++) {
            $totalDistance += $this->haversineDistance([$flatCoords[$i][1], $flatCoords[$i][0]], [$flatCoords[$i+1][1], $flatCoords[$i+1][0]]);
        }

        return [
            'routes' => [
                [
                    'distance' => $totalDistance,
                    'duration' => $totalDuration,
                    'is_network_route' => true,
                    'total_fare' => $totalFare,
                    'transit_segments' => $transitSegments,
                    'stops' => $routeStops,
                    'geometry' => [
                        'coordinates' => $flatCoords,
                    ],
                    'legs' => [
                        [
                            'distance' => $totalDistance,
                            'duration' => $totalDuration,
                            'steps' => $steps,
                        ]
                    ]
                ]
            ]
        ];
    }

    /**
     * Helper to fetch road-snapped GeoJSON coordinates between two lat/lng points via OSRM.
     * Returns array of [lng, lat] coordinate pairs following the actual road network.
     */
    protected function getRoadGeometryBetweenPoints(array $from, array $to, string $mode = 'car'): array
    {
        $profile = match(strtolower($mode)) {
            'walk', 'foot' => 'foot',
            'bicycle', 'bike' => 'cycling',
            default => 'driving'
        };

        $url = "{$this->osrmBaseUrl}/route/v1/{$profile}/{$from[1]},{$from[0]};{$to[1]},{$to[0]}";

        try {
            $response = Http::timeout(4)->get($url, [
                'overview' => 'full',
                'geometries' => 'geojson',
            ]);

            if ($response->successful()) {
                $data = $response->json();
                if (isset($data['routes'][0]['geometry']['coordinates']) && is_array($data['routes'][0]['geometry']['coordinates'])) {
                    return $data['routes'][0]['geometry']['coordinates'];
                }
            }
        } catch (\Throwable $e) {
            Log::warning("Road geometry fetch failed: " . $e->getMessage());
        }

        return [[(float)$from[1], (float)$from[0]], [(float)$to[1], (float)$to[0]]];
    }
}
