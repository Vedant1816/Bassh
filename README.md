# Bassh - Event Discovery & Booking Platform

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Features](#features)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
- [Payment Integration](#payment-integration)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## 🎯 Overview

**Bassh** is a comprehensive event discovery and booking platform that connects users with nightlife events, clubs, and entertainment venues. The platform consists of:

- **Mobile App (React Native/Expo)**: Native iOS and Android app for event discovery, booking, and payment
- **Web Backend (Next.js)**: RESTful API server handling business logic, authentication, and payment processing
- **Web Dashboard**: Admin interface for club owners and staff to manage events

### Key Capabilities

- 🗺️ **Interactive Map**: Real-time location-based event discovery with heatmap visualization
- 🎫 **Event Booking**: Seamless ticket booking with participant management
- 💳 **Payment Processing**: Integrated Razorpay payment gateway with native SDK support
- 👥 **Multi-Role System**: Separate flows for customers, staff, and club owners
- 📱 **QR Code Generation**: Automatic QR code generation for entry verification
- 🔐 **Secure Authentication**: Supabase-based authentication with role-based access control

---

## 🏗️ Architecture

### System Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Mobile App    │────────▶│   Web Backend   │────────▶│    Supabase     │
│  (React Native) │         │    (Next.js)    │         │   (PostgreSQL)  │
└─────────────────┘         └─────────────────┘         └─────────────────┘
         │                           │
         │                           │
         ▼                           ▼
┌─────────────────┐         ┌─────────────────┐
│   Razorpay SDK   │         │   Razorpay API  │
│   (Native iOS)   │         │   (Payment)     │
└─────────────────┘         └─────────────────┘
```

### Component Flow

1. **User Authentication**: Supabase Auth → JWT tokens → Protected API routes
2. **Event Discovery**: Map-based search → Nearby events API → Real-time updates
3. **Booking Flow**: Event selection → Participant details → Price calculation → Payment
4. **Payment Processing**: Razorpay order creation → Native payment SDK → Verification → QR generation

---

## 🛠️ Tech Stack

### Mobile App (`myApp/`)
- **Framework**: Expo ~54.0.31 (React Native 0.81.5)
- **Navigation**: Expo Router v6 (file-based routing)
- **State Management**: React Hooks (useState, useEffect)
- **Maps**: Mapbox (@rnmapbox/maps)
- **Authentication**: Supabase JS SDK
- **Payment**: react-native-razorpay (native SDK)
- **UI Components**: Custom components with React Native
- **Language**: TypeScript

### Web Backend (`web/`)
- **Framework**: Next.js 16.1.3 (App Router)
- **Runtime**: Node.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with JWT
- **Payment**: Razorpay Node.js SDK
- **Image Processing**: QR Code generation (qrcode)
- **SMS/OTP**: Twilio (WhatsApp OTP)
- **Language**: TypeScript

### Infrastructure
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage (for images)
- **Payment Gateway**: Razorpay
- **Containerization**: Docker & Docker Compose

---

## 📁 Project Structure

```
Bassh/
├── myApp/                    # React Native mobile app
│   ├── app/                  # Expo Router pages
│   │   ├── (auth)/          # Authentication screens
│   │   ├── (tabs)/          # Main app tabs (Home, Events, Booking, Profile)
│   │   ├── event/           # Event detail & booking
│   │   ├── payment/         # Payment success screen
│   │   ├── onboarding/      # User onboarding flow
│   │   └── staff/           # Staff-specific screens
│   ├── _services/           # API configuration & auth utilities
│   ├── components/          # Reusable UI components
│   └── assets/             # Images, icons, fonts
│
├── web/                     # Next.js backend API
│   ├── app/
│   │   ├── api/            # REST API endpoints
│   │   │   ├── auth/       # Authentication endpoints
│   │   │   ├── bookings/  # Booking management
│   │   │   ├── events/    # Event CRUD operations
│   │   │   ├── payments/   # Payment processing
│   │   │   ├── clubs/     # Club information
│   │   │   └── users/     # User management
│   │   ├── dashboard/     # Admin dashboard (web)
│   │   └── services/      # Backend utilities (Supabase, auth)
│   └── lib/               # Shared libraries (Razorpay)
│
└── docker-compose.yml      # Docker orchestration
```

---

## ✨ Features

### User Features
- ✅ **Interactive Map**: Real-time location-based event discovery
- ✅ **Event Discovery**: Browse events by location, category, date
- ✅ **Event Details**: View event information, pricing, DJ details
- ✅ **Ticket Booking**: Multi-participant booking with age validation
- ✅ **Smart Pricing**: Automatic stag/couple pricing logic
- ✅ **Payment Integration**: Secure Razorpay payment processing
- ✅ **QR Code Entry**: Digital QR codes for venue entry
- ✅ **Booking History**: View past and upcoming bookings
- ✅ **User Profile**: Manage personal information and preferences
- ✅ **Onboarding Flow**: Guided setup for new users

### Staff Features
- ✅ **Staff Registration**: Separate signup flow for staff members
- ✅ **Club Association**: Join club workflow with approval system
- ✅ **Status Management**: Pending/Approved/Rejected status tracking

### Club Owner Features (Web Dashboard)
- ✅ **Event Management**: Create and manage events
- ✅ **Pricing Tiers**: Configure multiple ticket pricing options
- ✅ **Booking Analytics**: View booking statistics

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Expo CLI (`npm install -g expo-cli`)
- Docker & Docker Compose (optional, for containerized setup)
- Supabase account and project
- Razorpay account (for payments)
- Mapbox account (for maps)
- Twilio account (for WhatsApp OTP)

### Installation

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd Bassh
```

#### 2. Set Up Mobile App

```bash
cd myApp
npm install

# Create .env file
cp .env.example .env
# Add your environment variables (see Environment Variables section)
```

#### 3. Set Up Web Backend

```bash
cd web
npm install

# Create .env file
cp .env.example .env
# Add your environment variables
```

#### 4. Run with Docker (Recommended)

```bash
# From project root
docker-compose up
```

This will start:
- Expo dev server on `http://localhost:8081`
- Next.js API server on `http://localhost:3000`

#### 5. Run Locally (Alternative)

**Mobile App:**
```bash
cd myApp
npm start
# Scan QR code with Expo Go app or press 'i' for iOS simulator
```

**Web Backend:**
```bash
cd web
npm run dev
# Server runs on http://localhost:3000
```

---

## 🔐 Environment Variables

### Mobile App (`myApp/.env`)

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# API Configuration
EXPO_PUBLIC_API_URL=http://localhost:3000  # For physical devices, use your computer's IP
# Or use ngrok fallback: https://your-ngrok-url.ngrok-free.dev

# Mapbox
EXPO_PUBLIC_MAPBOX_TOKEN=your_mapbox_token

# Razorpay
EXPO_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id
```

### Web Backend (`web/.env`)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Razorpay
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Twilio (for WhatsApp OTP)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# App URL (for redirects)
APP_URL=http://localhost:3000
```

---

## 🗄️ Database Schema

### Core Tables

#### `users`
- `id` (UUID, Primary Key) - Links to Supabase Auth
- `email` (Text)
- `role` (Enum: 'user', 'staff', 'club')
- `created_at`, `updated_at` (Timestamps)

#### `customers`
- `id` (UUID, Foreign Key → users.id)
- `name`, `gender`, `dob` (Date of Birth)
- `phone_number`, `social_handle`
- `avatar_url`, `onboarding_completed` (Boolean)
- `created_at`, `updated_at`

#### `clubs`
- `id` (UUID, Primary Key)
- `club_name`, `address_text`
- `latitude`, `longitude` (Coordinates)
- `guest_count`, `description`
- `created_at`, `updated_at`

#### `events`
- `id` (UUID, Primary Key)
- `club_id` (UUID, Foreign Key → clubs.id)
- `name`, `categories` (Text Array)
- `about`, `age_limit`, `terms_and_conditions`
- `event_date` (Date), `start_time` (Time)
- `max_attendees`, `dj_name`, `dj_image_url`
- `banner_image_url`
- `created_at`, `updated_at`

#### `event_ticket_pricing`
- `id` (UUID, Primary Key)
- `event_id` (UUID, Foreign Key → events.id)
- `label` (Text), `price` (Decimal)
- `stag_price` (Decimal, Optional)
- `couple_price` (Decimal, Optional)

#### `bookings`
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key → users.id)
- `event_id` (UUID, Foreign Key → events.id)
- `club_id` (UUID, Foreign Key → clubs.id)
- `participants` (JSONB Array)
- `total_amount` (Decimal)
- `booking_date` (Date), `booking_time` (Time)
- `booking_status` (Enum: 'pending', 'confirmed', 'cancelled')
- `razorpay_order_id`, `razorpay_payment_id`
- `qr_code` (Text - Base64 data URL)
- `entry_status` (Enum: 'not_entered', 'entered')
- `created_at`, `updated_at`

#### `staff`
- `id` (UUID, Foreign Key → users.id)
- `club_id` (UUID, Foreign Key → clubs.id, Nullable)
- `club_name` (Text, Nullable)
- `status` (Enum: 'pending', 'approved', 'rejected')

---

## 📡 API Documentation

### Authentication

All protected endpoints require a Bearer token in the `Authorization` header:
```
Authorization: Bearer <supabase_access_token>
```

### Endpoints

#### Events

**GET `/api/events`**
- Get all events with filters
- Query params: `latitude`, `longitude`, `radius`, `date`

**GET `/api/events/[id]`**
- Get event details with pricing and club information
- Returns: Event data, club details, pricing tiers

**POST `/api/events`**
- Create new event (Club owners only)
- Body: `name`, `event_date`, `start_time`, `pricing[]`, etc.

#### Bookings

**POST `/api/bookings/create`**
- Create a new booking
- Body: `event_id`, `participants[]`, `total_amount`
- Returns: `booking_id`

**GET `/api/bookings/event/[id]`**
- Get event with pricing and availability
- Returns: Event info, pricing, booked count

#### Payments

**POST `/api/payments/checkout/create-order`**
- Create Razorpay order
- Body: `booking_id`, `amount`
- Returns: `order_id`, `key`, `amount` (in paise)

**POST `/api/payments/verify`**
- Verify payment and update booking
- Body: `booking_id`, `razorpay_payment_id`, `razorpay_order_id`, `razorpay_signature`
- Returns: `success`, `qr` (QR code data URL)

#### Clubs

**GET `/api/clubs/[id]`**
- Get club details with events

**GET `/api/clubs/nearby`**
- Get nearby clubs
- Query params: `latitude`, `longitude`, `radius`

#### Map

**GET `/api/map/heatmap`**
- Get event heatmap data for map visualization

**GET `/api/map/nearby`**
- Get nearby events for map markers

#### Authentication

**POST `/api/auth/send-whatsapp-otp`**
- Send OTP via WhatsApp
- Body: `phone_number`, `country_code`

**POST `/api/auth/verify-whatsapp-otp`**
- Verify OTP and create session
- Body: `phone_number`, `otp`

---

## 💳 Payment Integration

### Razorpay Flow

1. **Order Creation**: Backend creates Razorpay order with booking amount
2. **Native SDK**: Mobile app opens Razorpay native payment screen
3. **Payment Processing**: User completes payment via Razorpay
4. **Verification**: Backend verifies payment signature
5. **QR Generation**: QR code generated and stored in booking
6. **Success**: User redirected to success page with QR code

### Payment Status Flow

- `pending` → Booking created, payment not initiated
- `confirmed` → Payment successful, QR code generated
- `cancelled` → Payment failed or booking cancelled

### Pricing Logic

The system supports:
- **Standard Pricing**: Single price per ticket
- **Stag Pricing**: Lower price for single male entries
- **Couple Pricing**: Special pricing for male-female pairs

Automatic calculation based on participant gender distribution.

---

## 🚢 Deployment

### Mobile App

#### iOS
```bash
cd myApp
eas build --platform ios
eas submit --platform ios
```

#### Android
```bash
cd myApp
eas build --platform android
eas submit --platform android
```

### Web Backend

#### Vercel (Recommended)
```bash
cd web
vercel deploy
```

#### Docker
```bash
docker build -t bassh-web ./web
docker run -p 3000:3000 bassh-web
```

### Environment Setup

Ensure all environment variables are set in your deployment platform:
- Vercel: Project Settings → Environment Variables
- EAS: `eas secret:create` or `eas.json`

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Use TypeScript for type safety
- Follow ESLint configuration
- Write descriptive commit messages
- Add comments for complex logic

---

## 📝 License

[Your License Here]

---

## 📞 Support

For issues, questions, or contributions, please open an issue on GitHub or contact the development team.

---

## 🔄 Changelog

### Version 1.0.0
- Initial release
- Event discovery and booking
- Razorpay payment integration
- QR code generation
- Multi-role authentication system
