# Bassh Mobile App - React Native/Expo

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Features](#features)
- [Getting Started](#getting-started)
- [Environment Setup](#environment-setup)
- [Navigation Structure](#navigation-structure)
- [Key Components](#key-components)
- [API Integration](#api-integration)
- [Payment Flow](#payment-flow)
- [Map Integration](#map-integration)
- [Building & Deployment](#building--deployment)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The **Bassh Mobile App** is a React Native application built with Expo that provides users with an intuitive interface to discover events, book tickets, and manage their nightlife experiences. The app features:

- 🗺️ **Interactive Map**: Real-time location-based event discovery with Mapbox
- 🎫 **Event Booking**: Complete booking flow with participant management
- 💳 **Native Payments**: Razorpay SDK integration for seamless payment processing
- 📱 **QR Codes**: Digital entry passes for venue access
- 👤 **User Profiles**: Personalized experience with onboarding flow
- 🔐 **Secure Auth**: Supabase-based authentication

---

## 🏗️ Architecture

### App Architecture

```
┌─────────────────────────────────────────────────┐
│              Expo Router (File-based)            │
├─────────────────────────────────────────────────┤
│  (auth)  │  (tabs)  │  event/  │  payment/     │
│  - login │  - index │  - [id]   │  - success    │
│  - signup│  - events│  - book   │                │
│          │  - booking│          │                │
│          │  - profile│           │                │
└─────────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
┌─────────────────┐  ┌─────────────────┐
│  _services/     │  │  components/    │
│  - api-config   │  │  - UI elements  │
│  - auth-fetch   │  │  - LocationPicker│
│  - supabase     │  │  - Custom views  │
└─────────────────┘  └─────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│      External Services          │
│  - Supabase (Auth & Database)   │
│  - Next.js API (Backend)        │
│  - Razorpay (Payments)          │
│  - Mapbox (Maps)                │
└─────────────────────────────────┘
```

### State Management

- **Local State**: React Hooks (`useState`, `useEffect`)
- **Navigation State**: Expo Router (file-based routing)
- **Auth State**: Supabase Auth (session management)
- **API State**: Fetch with async/await patterns

---

## 🛠️ Tech Stack

### Core Dependencies

```json
{
  "expo": "~54.0.31",
  "react-native": "0.81.5",
  "expo-router": "~6.0.21",
  "@supabase/supabase-js": "^2.91.0",
  "@rnmapbox/maps": "^10.2.10",
  "react-native-razorpay": "^2.3.1"
}
```

### Key Libraries

- **Expo Router**: File-based navigation system
- **Supabase JS**: Authentication and database client
- **Mapbox**: Native map rendering and location services
- **Razorpay**: Native payment SDK for iOS/Android
- **React Native Gesture Handler**: Touch interactions
- **Expo Location**: GPS and location permissions

---

## 📁 Project Structure

```
myApp/
├── app/                          # Expo Router pages
│   ├── _layout.tsx              # Root layout with auth guard
│   ├── (auth)/                  # Authentication group
│   │   ├── _layout.tsx
│   │   ├── index.tsx            # Auth landing page
│   │   ├── login.tsx            # User login
│   │   ├── signup.tsx           # User registration
│   │   ├── staff-login.tsx      # Staff login
│   │   └── staff-signup.tsx     # Staff registration
│   │
│   ├── (tabs)/                   # Main app tabs
│   │   ├── _layout.tsx          # Tab navigation layout
│   │   ├── index.tsx            # Home (Map view)
│   │   ├── events.tsx           # Events list
│   │   ├── booking.tsx          # Booking history
│   │   └── profile.tsx          # User profile
│   │
│   ├── event/                    # Event-related screens
│   │   ├── [id].tsx             # Event details
│   │   └── [id]/
│   │       └── book.tsx        # Booking flow
│   │
│   ├── payment/                  # Payment screens
│   │   └── success.tsx          # Payment success with QR
│   │
│   ├── onboarding/              # User onboarding
│   │   ├── about-you.tsx       # Name, gender, DOB
│   │   ├── avatar.tsx          # Profile picture
│   │   ├── dob.tsx             # Date of birth picker
│   │   ├── phone.tsx           # Phone number entry
│   │   ├── social.tsx           # Social media handle
│   │   └── verify-phone.tsx    # OTP verification
│   │
│   ├── club/                    # Club pages
│   │   └── [clubId].tsx        # Club details with events
│   │
│   ├── staff/                   # Staff-specific screens
│   │   ├── index.tsx           # Staff dashboard
│   │   └── join-club.tsx       # Club association
│   │
│   └── modal.tsx                # Global modal
│
├── _services/                    # Core services
│   ├── api-config.ts           # API URL configuration & fallback
│   ├── auth-fetch.ts            # Authenticated fetch wrapper
│   ├── supabase-public.ts       # Supabase client (public)
│   └── user-role.ts             # Role-based routing
│
├── components/                   # Reusable components
│   ├── ui/                      # UI primitives
│   │   ├── icon-symbol.tsx
│   │   └── collapsible.tsx
│   ├── themed-text.tsx
│   ├── themed-view.tsx
│   └── haptic-tab.tsx
│
├── constants/
│   └── theme.ts                 # Color scheme & styling
│
├── hooks/                        # Custom React hooks
│   ├── use-color-scheme.ts
│   └── use-theme-color.ts
│
└── assets/                      # Static assets
    └── images/                  # Icons, splash screens
```

---

## ✨ Features

### 1. Authentication & Onboarding

**User Flow:**
- Email/password signup → Supabase Auth
- Onboarding: About You → DOB → Phone → Social → Avatar
- Data stored in `customers` table
- Automatic redirect based on onboarding status

**Staff Flow:**
- Separate staff signup/login
- Club association workflow
- Status-based access control (pending/approved/rejected)

### 2. Event Discovery

**Home Screen (Map View):**
- Interactive Mapbox map with user location
- Heatmap visualization of event density
- Tap markers to view event details
- Location picker sheet for manual location selection
- Real-time location updates

**Events List:**
- Browse all available events
- Filter by date, category
- Event cards with images and key info

### 3. Event Details & Booking

**Event Detail Page:**
- Full event information
- DJ details and images
- Pricing tiers display
- Club information and location
- "Book Ticket" button

**Booking Flow:**
1. Select ticket quantity and pricing tier
2. Add participant details (name, gender, age, email)
3. Age validation against event age limit
4. Automatic price calculation (stag/couple logic)
5. Review summary with price breakdown
6. Proceed to payment

### 4. Payment Processing

**Razorpay Integration:**
- Native SDK for iOS/Android
- Order creation via backend API
- Secure payment processing
- Payment verification with signature
- Automatic QR code generation

**Payment Flow:**
```
Checkout → Create Booking → Create Razorpay Order → 
Open Native Payment → Verify Payment → Generate QR → Success Screen
```

### 5. Booking Management

- View booking history
- See upcoming and past bookings
- QR code display for entry
- Booking status tracking

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac) or Android Emulator
- Expo Go app (for physical device testing)

### Installation

```bash
# Navigate to mobile app directory
cd myApp

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your credentials (see Environment Setup)

# Start development server
npm start
```

### Running on Different Platforms

```bash
# iOS Simulator (Mac only)
npm run ios

# Android Emulator
npm run android

# Web (for testing)
npm run web

# Physical device (scan QR with Expo Go)
npm start
```

---

## 🔐 Environment Setup

Create a `.env` file in the `myApp/` directory:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# API Backend URL
# For iOS Simulator/Android Emulator: http://localhost:3000
# For Android Emulator: http://10.0.2.2:3000
# For physical devices: http://YOUR_COMPUTER_IP:3000
# Or use ngrok: https://your-ngrok-url.ngrok-free.dev
EXPO_PUBLIC_API_URL=http://localhost:3000

# Mapbox Token
EXPO_PUBLIC_MAPBOX_TOKEN=your-mapbox-token

# Razorpay (for native payment SDK)
EXPO_PUBLIC_RAZORPAY_KEY_ID=your-razorpay-key-id
```

### Getting Your Computer's IP (for Physical Devices)

**Mac/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Windows:**
```bash
ipconfig
```

Look for your local network IP (usually starts with 192.168.x.x or 10.0.x.x)

---

## 🧭 Navigation Structure

### Route Groups

**`(auth)`** - Authentication screens (no tabs)
- `/login` - User login
- `/signup` - User registration
- `/staff-login` - Staff login
- `/staff-signup` - Staff registration

**`(tabs)`** - Main app navigation (tab bar)
- `/(tabs)` or `/(tabs)/index` - Home (Map)
- `/(tabs)/events` - Events list
- `/(tabs)/booking` - Booking history
- `/(tabs)/profile` - User profile

**Dynamic Routes:**
- `/event/[id]` - Event details
- `/event/[id]/book` - Booking flow
- `/club/[clubId]` - Club details
- `/payment/success` - Payment success
- `/onboarding/*` - Onboarding steps

### Navigation Guards

The root `_layout.tsx` implements:
- Auth check (redirects to login if not authenticated)
- Onboarding check (redirects to onboarding if incomplete)
- Role-based routing (staff vs user flows)

---

## 🧩 Key Components

### API Configuration (`_services/api-config.ts`)

**Features:**
- Platform-specific API URL detection
- Automatic fallback to ngrok URL if primary fails
- Timeout handling (5 seconds)
- Error recovery

**Usage:**
```typescript
import { fetchWithFallback, API_BASE_URL } from '@/_services/api-config';

// With automatic fallback
const response = await fetchWithFallback('/api/events', {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' }
});
```

### Authenticated Fetch (`_services/auth-fetch.ts`)

**Features:**
- Automatic JWT token attachment
- Session management
- Error handling

**Usage:**
```typescript
import { withAuthHeaders, authFetch } from '@/_services/auth-fetch';

// Option 1: Add headers to existing fetch
const headers = await withAuthHeaders({
  method: 'POST',
  body: JSON.stringify(data)
});
const res = await fetch(`${API_BASE_URL}/api/endpoint`, headers);

// Option 2: Use helper with fallback
const res = await authFetch('/api/endpoint', {
  method: 'POST',
  body: JSON.stringify(data)
});
```

### Location Picker (`components/LocationPickerSheet.tsx`)

Interactive bottom sheet for selecting map location with:
- Map preview
- Search functionality
- Current location button
- Coordinate selection

---

## 📡 API Integration

### API Base URL

The app uses a smart API configuration that:
1. Tries the primary URL (from `EXPO_PUBLIC_API_URL`)
2. Falls back to ngrok URL if primary fails
3. Handles timeouts and network errors gracefully

### API Endpoints Used

**Events:**
- `GET /api/events` - List all events
- `GET /api/events/[id]` - Event details
- `GET /api/map/heatmap` - Heatmap data
- `GET /api/map/nearby` - Nearby events

**Bookings:**
- `POST /api/bookings/create` - Create booking
- `GET /api/bookings/event/[id]` - Event with pricing

**Payments:**
- `POST /api/payments/checkout/create-order` - Create Razorpay order
- `POST /api/payments/verify` - Verify payment

**Clubs:**
- `GET /api/clubs/[id]` - Club details
- `GET /api/clubs/nearby` - Nearby clubs

---

## 💳 Payment Flow

### Detailed Payment Process

1. **User clicks "Checkout"** on booking summary
2. **Create Booking** - Backend creates booking record with status "pending"
3. **Create Razorpay Order** - Backend creates order and returns order_id
4. **Open Native Payment** - App opens Razorpay native SDK
5. **User completes payment** - Payment processed by Razorpay
6. **Payment callback** - Razorpay returns payment details
7. **Verify payment** - Backend verifies signature and updates booking
8. **Generate QR code** - Backend generates QR and stores in booking
9. **Navigate to success** - Show QR code and booking confirmation

### Code Flow (`app/event/[id]/book.tsx`)

```typescript
const handleCheckout = async () => {
  // 1. Create booking
  const bookingRes = await fetchWithFallback('/api/bookings/create', ...);
  
  // 2. Create Razorpay order
  const orderRes = await fetchWithFallback('/api/payments/checkout/create-order', ...);
  
  // 3. Open Razorpay (native SDK)
  const RazorpayCheckout = require('react-native-razorpay').default;
  RazorpayCheckout.open(options)
    .then(async (response) => {
      // 4. Verify payment
      const verifyRes = await fetchWithFallback('/api/payments/verify', ...);
      
      // 5. Navigate to success
      router.replace(`/payment/success?qr=${qr}&booking_id=${id}`);
    });
};
```

### Pricing Logic

The app implements smart pricing:
- **Stag entries**: Use `stag_price` if available
- **Couple entries**: Pair male-female, use `couple_price`
- **Mixed groups**: Combine couple pricing with stag pricing
- Automatic calculation based on participant gender

---

## 🗺️ Map Integration

### Mapbox Setup

1. **Get Mapbox Token**: Sign up at mapbox.com
2. **Add to .env**: `EXPO_PUBLIC_MAPBOX_TOKEN=your-token`
3. **Configure in app.json**: Token is automatically injected

### Map Features

**Home Screen Map:**
- User location tracking
- Event markers with clustering
- Heatmap overlay
- Tap to view event details
- Location picker sheet

**Implementation:**
```typescript
import Mapbox from '@rnmapbox/maps';

<Mapbox.MapView
  style={styles.map}
  onPress={handleMapPress}
>
  <Mapbox.Camera
    zoomLevel={12}
    centerCoordinate={[longitude, latitude]}
  />
  <Mapbox.PointAnnotation coordinate={[lng, lat]} />
</Mapbox.MapView>
```

---

## 🏗️ Building & Deployment

### Development Build

```bash
# iOS
npx expo run:ios

# Android
npx expo run:android
```

### Production Build

**Using EAS Build (Recommended):**

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure (first time)
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

**Build Profiles:**

Create `eas.json`:
```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.yourdomain.com"
      }
    },
    "development": {
      "developmentClient": true
    }
  }
}
```

### App Store Submission

```bash
# iOS
eas submit --platform ios

# Android
eas submit --platform android
```

---

## 🔧 Troubleshooting

### Common Issues

**1. API Connection Failed**
- Check `EXPO_PUBLIC_API_URL` in `.env`
- For physical devices, use computer's IP address
- Ensure backend server is running
- Check firewall settings

**2. Razorpay Not Opening**
- Ensure native modules are linked: `npx expo prebuild`
- Rebuild native app: `npx expo run:ios` or `npx expo run:android`
- Check Razorpay key in `app.json` and `.env`

**3. Map Not Loading**
- Verify Mapbox token in `.env`
- Check token permissions in Mapbox dashboard
- Ensure location permissions are granted

**4. Authentication Issues**
- Verify Supabase URL and keys
- Check network connectivity
- Clear app cache: `npx expo start -c`

**5. Payment Verification Fails**
- Check backend logs for error details
- Verify Razorpay keys match between app and backend
- Ensure booking exists before payment

### Debug Mode

Enable detailed logging:
```typescript
// In api-config.ts or auth-fetch.ts
console.log('API Request:', url, options);
console.log('API Response:', response);
```

### Network Debugging

Use React Native Debugger or Flipper to inspect:
- Network requests
- Redux state (if used)
- Console logs
- Performance metrics

---

## 📚 Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [Expo Router Docs](https://docs.expo.dev/router/introduction/)
- [React Native Docs](https://reactnative.dev/)
- [Supabase Docs](https://supabase.com/docs)
- [Mapbox React Native](https://github.com/rnmapbox/maps)
- [Razorpay React Native](https://github.com/razorpay/razorpay-react-native)

---

## 📝 License

[Your License Here]

---

## 🤝 Contributing

See main project README for contribution guidelines.

---

**Last Updated**: 2025-01-25
