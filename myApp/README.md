# Bassh Mobile App (myApp)

The `myApp/` directory contains the React Native mobile application built with Expo. It provides the user-facing experience for discovering events, booking tickets, making payments, and managing bookings. It also includes a staff registration flow for club employees.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Directory Structure](#directory-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [App Architecture](#app-architecture)
- [Navigation & Routing](#navigation--routing)
- [Screens & Features](#screens--features)
- [Services & API Layer](#services--api-layer)
- [Components](#components)
- [Configuration Files](#configuration-files)
- [Docker](#docker)
- [Building & Deployment](#building--deployment)

---

## Tech Stack

| Layer            | Technology                     | Version    | Purpose                              |
|------------------|--------------------------------|------------|--------------------------------------|
| Framework        | Expo                           | ~54.0.33   | React Native development platform    |
| React Native     | React Native                   | 0.81.5     | Cross-platform mobile UI             |
| Navigation       | Expo Router                    | ~6.0.23    | File-based routing                   |
| Maps             | Mapbox (@rnmapbox/maps)        | 10.2.10    | Interactive maps with heatmaps       |
| Auth             | Supabase JS SDK                | 2.91.0     | Authentication & database access     |
| Payments         | react-native-razorpay          | 2.3.1      | Native payment SDK (UPI, cards)      |
| Bottom Sheet     | @gorhom/bottom-sheet           | 5.2.8      | Draggable bottom sheet UI            |
| Animations       | react-native-reanimated        | ~4.1.1     | Smooth UI animations                 |
| Gestures         | react-native-gesture-handler   | ~2.28.0    | Touch gesture handling               |
| QR Codes         | react-native-qrcode-svg        | 6.3.21     | QR code rendering for bookings       |
| Image Handling   | expo-image                     | ~3.0.11    | Optimised image loading              |
| Camera           | expo-camera                    | ~17.0.10   | QR code scanning for entry           |
| Location         | expo-location                  | ~19.0.8    | User location for nearby events      |
| Storage          | AsyncStorage                   | 2.2.0      | Local key-value storage              |
| Firebase         | firebase                       | 12.8.0     | Push notifications & analytics       |
| Language         | TypeScript                     | ~5.9.2     | Type safety                          |
| JS Engine        | Hermes                         | default    | Optimised JS engine                  |

---

## Directory Structure

```
myApp/
├── app/                               # ── Expo Router Pages (file-based routing) ──
│   ├── _layout.tsx                    # Root layout — auth guard, navigation setup
│   ├── modal.tsx                      # Modal screen configuration
│   │
│   ├── (auth)/                        # Auth Group (unauthenticated users)
│   │   └── [login & signup screens]   # Phone input, OTP verification, onboarding
│   │
│   ├── (tabs)/                        # Tab Navigation Group (main app)
│   │   ├── _layout.tsx               # Tab bar configuration
│   │   ├── index.tsx                 # Home tab — map with event markers & heatmap
│   │   ├── events.tsx                # Events tab — browse & filter events
│   │   ├── booking.tsx               # Booking tab — booking history & upcoming
│   │   └── profile.tsx               # Profile tab — user info, wallet, settings
│   │
│   ├── event/[id]/                    # Event Detail & Booking Flow
│   │   └── [screens]                 # Event info, pricing tiers, participant form
│   │
│   ├── booking/                       # Booking Flow Screens
│   │   └── [screens]                 # Participant details, price review, payment
│   │
│   ├── payment/                       # Payment Result
│   │   └── [screens]                 # Payment success with QR code display
│   │
│   ├── onboarding/                    # User Onboarding
│   │   └── [screens]                 # Name, gender, DOB, preferences setup
│   │
│   ├── club/                          # Club Detail
│   │   ├── [clubId]/                 # Club info, events, reviews
│   │   └── components/              # Club-specific UI components
│   │
│   ├── staff/                         # Staff Registration
│   │   └── [screens]                 # Staff signup, club association, status
│   │
│   ├── category/                      # Event Categories
│   │   └── [screens]                 # Category-based event browsing
│   │
│   ├── transaction/                   # Transaction History
│   │   └── [screens]                 # Past transactions & details
│   │
│   ├── auth/                          # Auth-related Screens
│   │   └── [screens]                 # Additional auth flows
│   │
│   └── components/                    # Screen-level Shared Components
│       └── ui/                       # Reusable UI elements (buttons, cards, inputs)
│
├── _services/                         # ── API & Auth Services ──
│   ├── api-config.ts                 # API base URL configuration & fetch helpers
│   ├── auth-fetch.ts                 # Authenticated fetch wrapper (attaches JWT)
│   ├── supabase-public.ts            # Supabase client initialization
│   └── user-role.ts                  # Role-based route redirection logic
│
├── components/                        # ── Reusable Components ──
│   ├── DismissKeyboardView.tsx       # Tap-to-dismiss keyboard wrapper
│   ├── external-link.tsx             # External URL link component
│   ├── haptic-tab.tsx                # Tab bar button with haptic feedback
│   ├── hello-wave.tsx                # Animated wave emoji component
│   ├── parallax-scroll-view.tsx      # Parallax header scroll view
│   ├── themed-text.tsx               # Theme-aware text component
│   ├── themed-view.tsx               # Theme-aware view component
│   └── ui/                           # UI component sub-library
│
├── hooks/                             # ── Custom React Hooks ──
│   └── use-color-scheme.ts           # System colour scheme detection
│
├── constants/                         # ── App Constants ──
│   └── Colors.ts                     # Light/dark theme colour definitions
│
├── services/                          # ── Additional Services ──
│   └── redirect-staff.ts            # Staff role redirect logic
│
├── assets/                            # ── Static Assets ──
│   └── images/                       # App icon, logo, splash screen, illustrations
│
├── app.json                           # Expo configuration (permissions, plugins, etc.)
├── eas.json                           # EAS Build & Submit configuration
├── package.json                       # Dependencies & scripts
├── tsconfig.json                      # TypeScript configuration
├── metro.config.js                    # Metro bundler configuration
├── eslint.config.js                   # ESLint rules
├── custom.d.ts                        # Custom TypeScript declarations
├── Dockerfile                         # Docker container configuration
└── .gitignore                         # Git ignore rules
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (macOS) or Android Emulator, or a physical device with Expo Go
- The web backend (`web/`) running locally or deployed (API URL needed)

### Installation

```bash
cd myApp
npm install
```

### Configure Environment

Create a `.env` file in the `myApp/` directory (see [Environment Variables](#environment-variables) below).

### Start Development Server

```bash
# Tunnel mode (recommended for physical devices)
npm start

# LAN mode (same network)
npm run start:lan

# Local mode
npm run start:local
```

Scan the QR code with the Expo Go app on your device, or press `i` for iOS simulator / `a` for Android emulator.

---

## Environment Variables

Create a `.env` file in the `myApp/` directory with the following variables:

### Supabase Configuration

| Variable                    | Required | Description                                                       |
|-----------------------------|----------|-------------------------------------------------------------------|
| `EXPO_PUBLIC_SUPABASE_URL`  | Yes      | Your Supabase project URL (e.g., `https://xyz.supabase.co`)      |
| `EXPO_PUBLIC_ANON_KEY`      | Yes      | Supabase anonymous/public key for client-side auth                |
| `SERVICE_ROLE_KEY`          | Yes      | Supabase service role key (use only in secure contexts)           |

### API Configuration

| Variable               | Required | Description                                                          |
|------------------------|----------|----------------------------------------------------------------------|
| `EXPO_PUBLIC_API_URL`  | Yes      | Base URL for the web backend API (e.g., `https://your-api.vercel.app/` or `http://localhost:3000/`) |

### Mapbox Configuration

| Variable                          | Required | Description                                           |
|-----------------------------------|----------|-------------------------------------------------------|
| `EXPO_PUBLIC_MAPBOX_TOKEN`        | Yes      | Mapbox public access token (starts with `pk.`)        |
| `EXPO_PUBLIC_MAPBOX_SECRET_TOKEN` | Yes      | Mapbox secret token (starts with `sk.`) for map tiles |

### Razorpay Configuration

| Variable                       | Required | Description                                   |
|--------------------------------|----------|-----------------------------------------------|
| `EXPO_PUBLIC_RAZORPAY_KEY_ID`  | Yes      | Razorpay Key ID for payment processing        |

### Example `.env` file

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_ANON_KEY=your_supabase_anon_key
SERVICE_ROLE_KEY=your_service_role_key

EXPO_PUBLIC_API_URL=http://localhost:3000/
EXPO_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_public_token
EXPO_PUBLIC_MAPBOX_SECRET_TOKEN=sk.your_mapbox_secret_token
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
```

---

## Available Scripts

| Command              | Description                                          |
|----------------------|------------------------------------------------------|
| `npm start`          | Start Expo dev server in tunnel mode                 |
| `npm run start:local`| Start Expo dev server in local mode                  |
| `npm run start:lan`  | Start Expo dev server in LAN mode                    |
| `npm run android`    | Run on Android emulator/device                       |
| `npm run ios`        | Run on iOS simulator                                 |
| `npm run ios:device` | Build and run on physical iOS device                 |
| `npm run web`        | Run as web app                                       |
| `npm run lint`       | Run ESLint                                           |
| `npm run reset-project` | Reset project to clean state                     |

---

## App Architecture

### Overview

The app follows a layered architecture:

```
┌────────────────────────────────────────────────┐
│                  Screens (app/)                 │
│  File-based routes via Expo Router              │
├────────────────────────────────────────────────┤
│               Components (components/)          │
│  Reusable UI elements, themed wrappers          │
├────────────────────────────────────────────────┤
│              Services (_services/)              │
│  API client, auth-fetch, Supabase client        │
├────────────────────────────────────────────────┤
│          Third-Party SDKs & Libraries           │
│  Mapbox, Razorpay, Supabase, Firebase           │
└────────────────────────────────────────────────┘
```

### Auth Flow

1. App launches with `_layout.tsx` which checks Supabase auth state
2. Unauthenticated users are routed to the `(auth)` group (login/signup)
3. User enters phone number, receives WhatsApp OTP (via web backend + Twilio)
4. On verification, Supabase Auth returns JWT tokens stored locally
5. `user-role.ts` determines routing based on role (`user`, `staff`, `club`)
6. New users proceed through the `onboarding/` flow
7. Authenticated API calls use `auth-fetch.ts` which attaches the JWT token

### Booking Flow

1. User discovers event via map (Home tab) or Events tab
2. Taps event to view details at `event/[id]/`
3. Selects pricing tier and enters participant details
4. Price is calculated based on gender distribution (stag vs couple pricing)
5. Razorpay native SDK opens for payment
6. Backend verifies payment and generates QR code
7. Success screen displays QR code for venue entry

---

## Navigation & Routing

The app uses **Expo Router v6** with file-based routing. The navigation structure is:

### Route Groups

| Group        | Path           | Description                              |
|--------------|----------------|------------------------------------------|
| `(auth)`     | `/`            | Login, signup, OTP screens (guest only)  |
| `(tabs)`     | `/`            | Main tab navigation (authenticated)      |

### Tab Bar

| Tab      | Screen        | Description                                |
|----------|---------------|--------------------------------------------|
| Home     | `(tabs)/`     | Interactive Mapbox map with event markers & heatmap |
| Events   | `(tabs)/events` | Browse, filter, and search events        |
| Booking  | `(tabs)/booking` | Booking history and upcoming bookings   |
| Profile  | `(tabs)/profile` | User profile, wallet, settings          |

### Dynamic Routes

| Route                  | Description                        |
|------------------------|------------------------------------|
| `event/[id]`           | Event detail and booking entry     |
| `club/[clubId]`        | Club detail page                   |
| `booking/...`          | Multi-step booking flow            |
| `payment/...`          | Payment result with QR code        |
| `transaction/...`      | Transaction detail view            |
| `category/...`         | Category-filtered event list       |

---

## Screens & Features

### Home (Map)
- Mapbox interactive map centred on user location
- Event markers for nearby events
- Heatmap overlay showing event density
- Tap markers to preview event details

### Events
- List view of events with filtering
- Filter by category, date, price range, DJ, age limit
- Search across events and clubs
- Bookmark favourite events

### Event Detail (`event/[id]`)
- Event banner image, name, date, time, DJ
- Club information and location
- Pricing tiers with stag/couple prices
- Participant form with name, gender, age
- Automatic price calculation
- Discount code application
- Proceed to payment

### Booking
- Active and past booking cards
- QR code display for confirmed bookings
- Booking status tracking (pending, confirmed, cancelled)
- Entry status (not entered, entered)

### Payment
- Razorpay native payment screen (UPI, cards, net banking, wallets)
- Payment success confirmation
- Generated QR code display and sharing

### Profile
- User information display
- Wallet balance and top-up
- Booking history
- Notification centre
- Settings

### Onboarding
- Step-by-step user profile setup
- Name, gender, date of birth
- Preferences selection

### Staff Flow
- Staff-specific registration
- Club association request
- Approval status tracking (pending / approved / rejected)
- Redirect to staff-specific screens on approval

### Club Detail (`club/[clubId]`)
- Club information, images, location
- Upcoming events at the club
- Reviews and ratings
- Guest count

---

## Services & API Layer

### `_services/` Directory

| File                | Purpose                                                           |
|---------------------|-------------------------------------------------------------------|
| `api-config.ts`     | Defines `API_URL` from `EXPO_PUBLIC_API_URL` env var; provides base fetch configuration |
| `auth-fetch.ts`     | Wrapper around `fetch` that attaches the Supabase JWT token as `Authorization: Bearer <token>` header |
| `supabase-public.ts`| Initialises and exports the Supabase client with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_ANON_KEY` |
| `user-role.ts`      | Fetches the user's role from the backend and handles role-based routing (user vs staff vs club) |

### `services/` Directory

| File                  | Purpose                                             |
|-----------------------|-----------------------------------------------------|
| `redirect-staff.ts`   | Handles staff-specific redirect logic after auth    |

### How API Calls Work

All API calls go through the web backend (`EXPO_PUBLIC_API_URL`):

```
Mobile App  →  auth-fetch.ts  →  Web Backend API  →  Supabase / Razorpay / etc.
```

The `auth-fetch.ts` wrapper automatically retrieves the current Supabase session token and attaches it to every request.

---

## Components

### Root-level `components/`

| Component                   | Description                                        |
|-----------------------------|----------------------------------------------------|
| `DismissKeyboardView.tsx`   | Wraps views to dismiss keyboard on tap             |
| `external-link.tsx`         | Opens URLs in system browser                       |
| `haptic-tab.tsx`            | Tab bar button with haptic feedback                |
| `hello-wave.tsx`            | Animated wave gesture component                    |
| `parallax-scroll-view.tsx`  | Scroll view with parallax header effect            |
| `themed-text.tsx`           | Text component that adapts to light/dark theme     |
| `themed-view.tsx`           | View component that adapts to light/dark theme     |

### Screen-level `app/components/`

Contains components shared across multiple screens, including the `ui/` sub-directory with reusable UI primitives (buttons, cards, inputs, etc.).

---

## Configuration Files

### `app.json` — Expo Configuration

- **App name**: bassh
- **Bundle ID**: `com.harshsehra.bassh` (iOS & Android)
- **Scheme**: `bassh` (deep linking)
- **JS Engine**: Hermes
- **New Architecture**: Enabled
- **React Compiler**: Enabled (experimental)
- **Typed Routes**: Enabled (experimental)
- **Orientation**: Portrait only
- **Plugins**: expo-router, @rnmapbox/maps, expo-location, expo-camera, expo-splash-screen, expo-web-browser, datetimepicker

### `eas.json` — EAS Build Configuration

Configures Expo Application Services for building and submitting the app to app stores.

### `tsconfig.json`

- Extends `expo/tsconfig.base`
- Strict mode enabled
- Path alias: `@/*` maps to `./`

### `metro.config.js`

Metro bundler configuration with SVG transformer support via `react-native-svg-transformer`.

---

## Docker

The mobile app has a `Dockerfile` for containerized development:

```bash
# From repo root with Docker Compose
docker-compose up --build expo

# Standalone
cd myApp
docker build -t bassh-expo .
docker run -p 8081:8081 --env-file .env bassh-expo
```

The container runs the Expo dev server on port **8081** with hot-reloading via volume mounts. Note that running Expo in Docker may limit device connectivity compared to running natively.

---

## Building & Deployment

### Development Builds

```bash
# Create a development build for testing native modules
eas build --profile development --platform ios
eas build --profile development --platform android
```

### Production Builds

```bash
# iOS
eas build --platform ios
eas submit --platform ios

# Android
eas build --platform android
eas submit --platform android
```

### Key Notes

- **Mapbox** requires native modules and will not work in Expo Go; use a development build
- **Razorpay** requires native modules and will not work in Expo Go; use a development build
- **Camera** permissions are configured in `app.json` for both iOS and Android
- **Location** permissions are configured for foreground and background access
- Set sensitive environment variables as EAS secrets for production builds:
  ```bash
  eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://..."
  ```
