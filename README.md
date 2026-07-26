# Journeymate

Journeymate (also known as IntelliTravel) is a comprehensive full-stack travel and itinerary planning application designed to help users organize their trips, manage their budgets, track expenses, and discover places, all in one seamless interface.

The project features a modern React frontend and a robust Laravel PHP backend. It is also designed to be cross-platform, capable of running as a web app or a native mobile app using Capacitor.

## Features

- **Dashboard**: A personalized overview of your upcoming trips, budget progress, and active itineraries.
- **Itinerary Planning**: Build out detailed daily plans with specific stops, locations, and schedules.
- **Mapping & Navigation**: Integrated mapping using Leaflet to visualize your journey, complete with map layer switching and route rendering.
- **Budget & Expenses Tracking**: Keep a close eye on your travel spending against your defined budgets.
- **Reviews & Places**: Discover, track, and review places of interest.
- **Cross-Platform**: Built as a responsive web application but wrapped with Capacitor for native iOS and Android deployment.

## Tech Stack

### Frontend
- **Framework**: [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Language**: TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) & Radix UI
- **Mobile Integration**: [Capacitor](https://capacitorjs.com/) (iOS/Android)
- **Maps**: Leaflet 

### Backend
- **Framework**: [Laravel](https://laravel.com/) (PHP)
- **Architecture**: RESTful API structure with specialized controllers and services (e.g., `LocationController`, `PlaceService`, `ItineraryController`).
- **Database**: MySQL/MariaDB (Standard Laravel setup)

## Project Structure

The repository is organized into two main parts:

- `/src` and `/public`: Contains the React frontend application code, including pages, components, layout files, and assets.
- `/backend`: Contains the complete Laravel backend application, providing the API endpoints and business logic for locations, routing, and itineraries.

## Getting Started

### Prerequisites
- Node.js & npm (for the frontend)
- PHP & Composer (for the backend)
- A local web server/database (like Laravel Herd, Valet, or XAMPP)

### Frontend Setup

1. Navigate to the project root directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install PHP dependencies:
   ```bash
   composer install
   ```
3. Set up your environment file:
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```
4. Configure your database settings in the `.env` file.
5. Run database migrations:
   ```bash
   php artisan migrate
   ```
6. Start the Laravel development server (if not using Herd/Valet):
   ```bash
   php artisan serve
   ```

## Mobile Development

This project uses Capacitor to bridge the web app to native mobile platforms. 

To build the web assets and sync configuration to native projects:
```bash
npm run build
npx cap sync
```

To open the respective native IDEs:
```bash
npx cap open android
npx cap open ios
```
