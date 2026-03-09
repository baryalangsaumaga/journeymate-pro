import type { Trip, TravelUser, ChatMessage, Review, Location, RouteInfo, Expense, TripBudget, CurrencyRate } from "@/types/travel";

export const currentUser: TravelUser = {
  id: "u1",
  name: "Alex Rivera",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
  isOnline: true,
  lastLocation: { lat: 14.5895, lng: 120.9740 },
  role: "owner",
};

export const collaborators: TravelUser[] = [
  { id: "u2", name: "Maya Chen", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maya", isOnline: true, lastLocation: { lat: 14.5547, lng: 121.0244 }, role: "editor" },
  { id: "u3", name: "Kai Santos", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Kai", isOnline: false, lastLocation: { lat: 14.6091, lng: 121.0223 }, role: "viewer" },
  { id: "u4", name: "Luna Park", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna", isOnline: true, lastLocation: { lat: 14.5833, lng: 120.9667 }, role: "editor" },
  { id: "u5", name: "Zara Ahmed", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Zara", isOnline: false, role: "viewer" },
];

export const mockLocations: Location[] = [
  { id: "l1", name: "Intramuros", lat: 14.5895, lng: 120.9740, type: "landmark", rating: 4.6, description: "Historic walled city, Spanish colonial era" },
  { id: "l2", name: "Rizal Park", lat: 14.5833, lng: 120.9667, type: "landmark", rating: 4.5, description: "National park & monument" },
  { id: "l3", name: "SM Mall of Asia", lat: 14.5351, lng: 120.9832, type: "poi", rating: 4.3, description: "One of the largest malls in Asia" },
  { id: "l4", name: "Poblacion", lat: 14.5647, lng: 121.0300, type: "restaurant", rating: 4.7, description: "Trendy food & nightlife district" },
  { id: "l5", name: "BGC", lat: 14.5547, lng: 121.0509, type: "city", rating: 4.4, description: "Modern business & lifestyle hub" },
  { id: "l6", name: "Shell SLEX", lat: 14.4200, lng: 121.0400, type: "gas-station", rating: 4.0, description: "Gas station along SLEX" },
  { id: "l7", name: "Tagaytay Ridge", lat: 14.1153, lng: 120.9621, type: "viewpoint", rating: 4.8, description: "Scenic view of Taal Volcano" },
  { id: "l8", name: "Manila Hotel", lat: 14.5833, lng: 120.9733, type: "hotel", rating: 4.6, description: "Historic luxury hotel" },
  { id: "l9", name: "Petronas NLEX", lat: 14.7500, lng: 120.9500, type: "gas-station", rating: 3.9, description: "Gas station along NLEX" },
  { id: "l10", name: "Antipolo View Deck", lat: 14.6261, lng: 121.1764, type: "viewpoint", rating: 4.5, description: "Panoramic city view at sunset" },
];

export const mockExpenses: Expense[] = [
  { id: "e1", tripId: "t1", category: "food", description: "Lunch at Intramuros", amount: 850, currency: "PHP", paidBy: "u1", splitAmong: ["u1", "u2", "u4"], date: "2026-03-15" },
  { id: "e2", tripId: "t1", category: "transport", description: "Grab to Poblacion", amount: 320, currency: "PHP", paidBy: "u2", splitAmong: ["u1", "u2"], date: "2026-03-15" },
  { id: "e3", tripId: "t1", category: "activities", description: "Fort Santiago entrance", amount: 225, currency: "PHP", paidBy: "u1", splitAmong: ["u1", "u2", "u4"], date: "2026-03-15" },
  { id: "e4", tripId: "t1", category: "food", description: "Dinner at Poblacion rooftop", amount: 4200, currency: "PHP", paidBy: "u4", splitAmong: ["u1", "u2", "u4"], date: "2026-03-16" },
  { id: "e5", tripId: "t1", category: "accommodation", description: "Manila Hotel 2 nights", amount: 12800, currency: "PHP", paidBy: "u1", splitAmong: ["u1", "u2", "u4"], date: "2026-03-15" },
  { id: "e6", tripId: "t1", category: "shopping", description: "Souvenirs from Intramuros", amount: 1500, currency: "PHP", paidBy: "u2", splitAmong: ["u2"], date: "2026-03-16" },
  { id: "e7", tripId: "t1", category: "transport", description: "Toll - SLEX", amount: 385, currency: "PHP", paidBy: "u1", splitAmong: ["u1", "u2", "u4"], date: "2026-03-17" },
  { id: "e8", tripId: "t1", category: "food", description: "Coffee at BGC cafe", amount: 580, currency: "PHP", paidBy: "u1", splitAmong: ["u1", "u4"], date: "2026-03-17" },
];

export const mockBudget: TripBudget = {
  tripId: "t1",
  totalBudget: 30000,
  currency: "PHP",
  categories: [
    { category: "food", allocated: 8000, spent: 5630 },
    { category: "transport", allocated: 3000, spent: 705 },
    { category: "accommodation", allocated: 14000, spent: 12800 },
    { category: "activities", allocated: 2000, spent: 225 },
    { category: "shopping", allocated: 2000, spent: 1500 },
    { category: "other", allocated: 1000, spent: 0 },
  ],
};

export const currencyRates: CurrencyRate[] = [
  { from: "PHP", to: "USD", rate: 0.018 },
  { from: "PHP", to: "EUR", rate: 0.016 },
  { from: "PHP", to: "JPY", rate: 2.68 },
  { from: "PHP", to: "GBP", rate: 0.014 },
  { from: "PHP", to: "KRW", rate: 24.1 },
  { from: "PHP", to: "SGD", rate: 0.024 },
  { from: "USD", to: "PHP", rate: 56.2 },
  { from: "EUR", to: "PHP", rate: 62.5 },
  { from: "JPY", to: "PHP", rate: 0.373 },
];

export const mockTrips: Trip[] = [
  {
    id: "t1",
    title: "Manila Heritage Walk",
    description: "Explore historic Manila from Intramuros to modern BGC",
    startDate: "2026-03-15",
    endDate: "2026-03-18",
    status: "active",
    coverImage: "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=800&q=80",
    isOfflineAvailable: true,
    collaborators: [currentUser, collaborators[0], collaborators[2]],
    expenses: mockExpenses,
    budget: mockBudget,
    stops: [
      { id: "s1", location: mockLocations[0], arrivalTime: "09:00", departureTime: "12:00", notes: "Fort Santiago & Manila Cathedral", transitType: "walk", weather: "sunny", temperature: 32, isCompleted: true },
      { id: "s2", location: mockLocations[1], arrivalTime: "12:30", departureTime: "14:00", notes: "Lunch at Rizal Park, visit monument", transitType: "walk", weather: "sunny", temperature: 33, isCompleted: true },
      { id: "s3", location: mockLocations[3], arrivalTime: "18:00", departureTime: "22:00", notes: "Dinner & rooftop bars", transitType: "car", weather: "cloudy", temperature: 29, isCompleted: false },
      { id: "s4", location: mockLocations[4], arrivalTime: "10:00", departureTime: "16:00", notes: "Art galleries & street food", transitType: "bus", weather: "sunny", temperature: 31, isCompleted: false },
    ],
  },
  {
    id: "t2",
    title: "Tagaytay Day Trip",
    description: "Quick escape to see Taal Volcano and enjoy bulalo",
    startDate: "2026-03-20",
    endDate: "2026-03-20",
    status: "planning",
    coverImage: "https://images.unsplash.com/photo-1580477667995-2b94f01c9516?w=800&q=80",
    isOfflineAvailable: false,
    collaborators: [currentUser, collaborators[1]],
    stops: [
      { id: "s5", location: mockLocations[6], arrivalTime: "08:00", departureTime: "12:00", notes: "Breakfast overlooking Taal", transitType: "car", weather: "foggy", temperature: 24, isCompleted: false },
    ],
  },
  {
    id: "t3",
    title: "Antipolo Sunset Chase",
    description: "Mountain views and local cafes",
    startDate: "2026-04-01",
    endDate: "2026-04-01",
    status: "planning",
    coverImage: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
    isOfflineAvailable: false,
    collaborators: [currentUser, collaborators[0], collaborators[1], collaborators[3]],
    stops: [
      { id: "s6", location: mockLocations[9], arrivalTime: "15:00", departureTime: "19:00", notes: "Golden hour photography", transitType: "car", weather: "sunny", temperature: 28, isCompleted: false },
    ],
  },
];

export const mockMessages: ChatMessage[] = [
  { id: "m1", userId: "u2", userName: "Maya Chen", userAvatar: collaborators[0].avatar, message: "I found this amazing hidden cafe near Intramuros! 🏰☕", timestamp: "2026-03-09T08:30:00Z", type: "text" },
  { id: "m2", userId: "u1", userName: "Alex Rivera", userAvatar: currentUser.avatar, message: "No way! Drop the pin 📍", timestamp: "2026-03-09T08:31:00Z", type: "text" },
  { id: "m3", userId: "u2", userName: "Maya Chen", userAvatar: collaborators[0].avatar, message: "📍 Shared location: Cafe de Letran", timestamp: "2026-03-09T08:32:00Z", type: "location" },
  { id: "m4", userId: "u4", userName: "Luna Park", userAvatar: collaborators[2].avatar, message: "Added it to our itinerary! We should go after Fort Santiago 🗺️", timestamp: "2026-03-09T08:35:00Z", type: "itinerary-update" },
  { id: "m5", userId: "u3", userName: "Kai Santos", userAvatar: collaborators[1].avatar, message: "I'll be 10 mins late, traffic on EDSA 🚗💨", timestamp: "2026-03-09T09:00:00Z", type: "text" },
  { id: "m6", userId: "u1", userName: "Alex Rivera", userAvatar: currentUser.avatar, message: "No worries! We're at the entrance gate. Weather is perfect today ☀️", timestamp: "2026-03-09T09:02:00Z", type: "text" },
  { id: "m7", userId: "u4", userName: "Luna Park", userAvatar: collaborators[2].avatar, message: "The sunset from Rizal Park was unreal yesterday 🌅", timestamp: "2026-03-09T09:10:00Z", type: "text" },
];

export const mockReviews: Review[] = [
  { id: "r1", userId: "u1", userName: "Alex Rivera", userAvatar: currentUser.avatar, locationId: "l1", locationName: "Intramuros", rating: 5, comment: "Absolutely stunning. The cobblestone streets and Spanish architecture transport you back centuries. A must-visit for history buffs!", images: [], timestamp: "2026-03-08T10:00:00Z", helpful: 24 },
  { id: "r2", userId: "u2", userName: "Maya Chen", userAvatar: collaborators[0].avatar, locationId: "l7", locationName: "Tagaytay Ridge", rating: 5, comment: "The view of Taal Volcano is breathtaking. Go early morning before the fog rolls in. The bulalo at Mahogany Market is 🔥", images: [], timestamp: "2026-03-05T14:00:00Z", helpful: 18 },
  { id: "r3", userId: "u4", userName: "Luna Park", userAvatar: collaborators[2].avatar, locationId: "l4", locationName: "Poblacion", rating: 4, comment: "Great nightlife district! El Chupacabra for tacos, Z Hostel rooftop for drinks. Gets crowded on weekends.", images: [], timestamp: "2026-03-07T22:00:00Z", helpful: 12 },
  { id: "r4", userId: "u3", userName: "Kai Santos", userAvatar: collaborators[1].avatar, locationId: "l10", locationName: "Antipolo View Deck", rating: 4, comment: "Perfect for sunset photography. Bring a jacket, it gets chilly. Try the local cashew nuts!", images: [], timestamp: "2026-03-06T18:00:00Z", helpful: 9 },
];

export const mockRouteInfo: RouteInfo = {
  distance: "64.2 km",
  duration: "1h 45min",
  speedLimit: "60-100 km/h",
  restrictions: ["No heavy trucks on Skyway", "ETC required for SLEX"],
  tollFee: "₱385",
  fuelStops: [mockLocations[5], mockLocations[8]],
  viewpoints: [mockLocations[6], mockLocations[9]],
};

export const heatmapData = [
  { lat: 14.5995, lng: 120.9842, intensity: 0.9, name: "Manila" },
  { lat: 14.5547, lng: 121.0509, intensity: 0.7, name: "BGC" },
  { lat: 14.1153, lng: 120.9621, intensity: 0.8, name: "Tagaytay" },
  { lat: 14.6261, lng: 121.1764, intensity: 0.5, name: "Antipolo" },
  { lat: 14.5351, lng: 120.9832, intensity: 0.6, name: "Pasay" },
  { lat: 14.6091, lng: 121.0223, intensity: 0.4, name: "Quezon City" },
  { lat: 14.5833, lng: 120.9667, intensity: 0.85, name: "Ermita" },
  { lat: 16.4023, lng: 120.5960, intensity: 0.3, name: "Baguio" },
  { lat: 10.3157, lng: 123.8854, intensity: 0.45, name: "Cebu" },
  { lat: 9.8500, lng: 124.0167, intensity: 0.35, name: "Bohol" },
];

export const languages = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
  { code: "pt", name: "Português", flag: "🇧🇷" },
  { code: "tl", name: "Filipino", flag: "🇵🇭" },
];
