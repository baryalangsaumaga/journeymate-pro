export type TransitType = "car" | "bus" | "train" | "plane" | "ferry" | "bike" | "walk";
export type TripStatus = "planning" | "active" | "completed" | "cancelled";
export type WeatherCondition = "sunny" | "cloudy" | "rainy" | "stormy" | "snowy" | "foggy" | "windy";
export type ReportType = "trip-summary" | "expense" | "itinerary" | "analytics";
export type ThemeMode = "light" | "dark" | "adventure" | "ocean" | "sunset";
export type Language = "en" | "es" | "fr" | "de" | "ja" | "ko" | "zh" | "ar" | "hi" | "pt";

export interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: "city" | "poi" | "landmark" | "hotel" | "restaurant" | "gas-station" | "viewpoint";
  description?: string;
  rating?: number;
  imageUrl?: string;
}

export interface ItineraryStop {
  id: string;
  location: Location;
  arrivalTime: string;
  departureTime: string;
  notes: string;
  transitType: TransitType;
  weather?: WeatherCondition;
  temperature?: number;
  isCompleted: boolean;
}

export interface Trip {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: TripStatus;
  coverImage: string;
  stops: ItineraryStop[];
  collaborators: TravelUser[];
  isOfflineAvailable: boolean;
}

export interface TravelUser {
  id: string;
  name: string;
  avatar: string;
  isOnline: boolean;
  lastLocation?: { lat: number; lng: number };
  role: "owner" | "editor" | "viewer";
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  message: string;
  timestamp: string;
  type: "text" | "location" | "image" | "itinerary-update";
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  locationId: string;
  locationName: string;
  rating: number;
  comment: string;
  images: string[];
  timestamp: string;
  helpful: number;
}

export interface RouteInfo {
  distance: string;
  duration: string;
  speedLimit?: string;
  restrictions?: string[];
  tollFee?: string;
  fuelStops: Location[];
  viewpoints: Location[];
}
