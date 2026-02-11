# Bassh

**Event Discovery & Booking Platform**

Bassh connects users with nightlife events, clubs, and entertainment venues. The platform provides real-time event discovery via interactive maps, seamless ticket booking with smart pricing, and a full admin dashboard for club owners to manage their business.

## Table of Contents

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

## Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Mobile App    │────────>│   Web Backend   │────────>│    Supabase     │
│  (React Native) │         │    (Next.js)    │         │   (PostgreSQL)  │
└─────────────────┘         └─────────────────┘         └─────────────────┘
         │                           │
         │                           │
         v                           v
┌─────────────────┐         ┌─────────────────┐
│  Razorpay SDK   │         │  Razorpay API   │
│  (Native iOS)   │         │   (Payments)    │
└─────────────────┘         └─────────────────┘
```

### Component Flow

1. **Authentication** — Supabase Auth issues JWT tokens for protected API routes
2. **Event Discovery** — Map-based search queries nearby events API with real-time updates
3. **Booking Flow** — Event selection, participant details, price calculation, payment
4. **Payment Processing** — Razorpay order creation, native SDK payment, verification, QR generation

---

## Tech Stack

### Mobile App (`myApp/`)

| Layer          | Technology                          |
|----------------|-------------------------------------|
| Framework      | Expo ~54.0 (React Native 0.81)      |
| Navigation     | Expo Router v6 (file-based routing) |
| Maps           | Mapbox (@rnmapbox/maps)             |
| Auth           | Supabase JS SDK                     |
| Payments       | react-native-razorpay (native SDK)  |
| Language       | TypeScript                          |

### Web Backend & Dashboard (`web/`)

| Layer          | Technology                          |
|----------------|-------------------------------------|
| Framework      | Next.js 16 (App Router)             |
| Database       | Supabase (PostgreSQL)               |
| Auth           | Supabase Auth with JWT              |
| Payments       | Razorpay Node.js SDK                |
| Charts         | Recharts                            |
| QR Generation  | qrcode                              |
| SMS/OTP        | Twilio (WhatsApp OTP)               |
| Styling        | Tailwind CSS 4                      |
| Cache          | Redis (ioredis / Upstash)           |
| Language       | TypeScript                          |

### Infrastructure

- **Database** — Supabase PostgreSQL
- **Authentication** — Supabase Auth
- **Storage** — Supabase Storage (images)
- **Payment Gateway** — Razorpay
- **Containerization** — Docker & Docker Compose

---

## Project Structure

```
Bassh/
├── myApp/                          # React Native mobile app
│   ├── app/                        # Expo Router pages
│   │   ├── (auth)/                 # Authentication screens
│   │   ├── (tabs)/                 # Main tabs (Home, Events, Booking, Profile)
│   │   ├── event/                  # Event detail & booking
│   │   ├── payment/                # Payment success screen
│   │   ├── onboarding/             # User onboarding flow
│   │   └── staff/                  # Staff-specific screens
│   ├── _services/                  # API config & auth utilities
│   ├── components/                 # Reusable UI components
│   └── assets/                     # Images, icons, fonts
│
├── web/                            # Next.js backend & dashboard
│   ├── app/
│   │   ├── api/                    # REST API endpoints
│   │   │   ├── auth/               # Authentication (OTP, WhatsApp)
│   │   │   ├── bookings/           # Booking management
│   │   │   ├── events/             # Event CRUD
│   │   │   ├── payments/           # Payment processing
│   │   │   ├── clubs/              # Club queries
│   │   │   ├── club/               # Club-specific operations
│   │   │   ├── discount/           # Discount management
│   │   │   ├── guests/             # Guest list management
│   │   │   ├── map/                # Map data (heatmap, nearby)
│   │   │   ├── menu/               # Menu management
│   │   │   ├── notifications/      # Notification system
│   │   │   ├── search/             # Search functionality
│   │   │   └── users/              # User management
│   │   ├── dashboard/              # Admin dashboard (web)
│   │   │   ├── billing/            # Billing & payouts
│   │   │   ├── discount/           # Discount management
│   │   │   ├── events/             # Event management
│   │   │   ├── guest/              # Guest list
│   │   │   ├── menu/               # Menu management
│   │   │   └── settings/           # Club settings
│   │   ├── auth/                   # Login & signup pages
│   │   ├── components/             # Shared UI components
│   │   └── services/               # Backend utilities
│   └── lib/                        # Shared libraries (Razorpay, Redis)
│
└── docker-compose.yml              # Docker orchestration
```

---

## Features

### Users (Mobile App)

- **Interactive Map** — Location-based event discovery with heatmap visualization
- **Event Discovery** — Browse and filter by category, age limit, DJ, date, time, and capacity
- **Real-time Search** — Instant search across events and clubs
- **Ticket Booking** — Multi-participant booking with age validation
- **Smart Pricing** — Automatic stag/couple pricing based on participant gender distribution
- **Payment Processing** — Secure Razorpay payment integration
- **QR Code Entry** — Digital QR codes generated on successful booking
- **Booking History** — View past and upcoming bookings
- **Wallet** — Quick-add wallet with ongoing event cards
- **Club Filtering** — Filter clubs by tier, rating, price range, and guest count
- **Notifications** — In-app notifications for booking confirmations and updates
- **Onboarding** — Guided setup for new users

### Staff (Mobile App)

- **Staff Registration** — Separate signup flow with club association
- **Club Association** — Join club workflow with approval system
- **Status Tracking** — Pending / Approved / Rejected status management

### Club Owners (Web Dashboard)

- **Revenue Dashboard** — Real-time revenue tracking with trend charts
- **Booking Analytics** — Current bookings with daily change metrics
- **Event Management** — Create, update, and delete events with image uploads
- **Pricing Tiers** — Configure multiple ticket pricing (stag/couple)
- **Discount Management** — Create and manage discount codes with scheduling
- **Guest List** — Manage guest lists with approval, VIP, and suspend actions
- **Billing & Payouts** — Transaction history, PDF export, and payout claims
- **Menu Management** — Club menu configuration
- **Settings** — Club info, location picker, visuals, legal policies, and operational details

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Expo CLI (`npm install -g expo-cli`)
- Docker & Docker Compose (optional)
- Supabase account and project
- Razorpay account
- Mapbox account
- Twilio account (for WhatsApp OTP)

### Installation

**1. Clone the repository**

```bash
git clone <repository-url>
cd Bassh
```

**2. Mobile App**

```bash
cd myApp
npm install
cp .env.example .env
# Configure environment variables (see below)
```

**3. Web Backend**

```bash
cd web
npm install
cp .env.example .env
# Configure environment variables (see below)
```

**4. Run with Docker (recommended)**

```bash
docker-compose up --build
```

This starts:
- Expo dev server on `http://localhost:8081`
- Next.js server on `http://localhost:3000`

**5. Run locally (alternative)**

```bash
# Terminal 1 — Mobile
cd myApp && npm start

# Terminal 2 — Web
cd web && npm run dev
```

---

## Environment Variables

### Mobile App (`myApp/.env`)

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
EXPO_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id
```

### Web Backend (`web/.env`)

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

APP_URL=http://localhost:3000
```

---

## Database Schema

### Core Tables

**`users`** — Authentication and role management

| Column       | Type      | Description                        |
|--------------|-----------|------------------------------------|
| id           | UUID (PK) | Links to Supabase Auth             |
| email        | Text      | User email                         |
| role         | Enum      | `user`, `staff`, `club`            |
| created_at   | Timestamp | Account creation time              |

**`customers`** — User profile data

| Column               | Type      | Description                |
|----------------------|-----------|----------------------------|
| id                   | UUID (FK) | References users.id        |
| name, gender, dob    | Various   | Profile information        |
| phone_number         | Text      | Contact number             |
| onboarding_completed | Boolean   | Onboarding status          |

**`clubs`** — Club/venue information

| Column              | Type        | Description              |
|---------------------|-------------|--------------------------|
| id                  | UUID (PK)   | Club identifier          |
| club_name           | Text        | Club name                |
| latitude, longitude | Decimal     | Geographic coordinates   |
| address_text        | Text        | Display address          |
| guest_count         | Integer     | Current guest count      |

**`events`** — Event listings

| Column           | Type        | Description              |
|------------------|-------------|--------------------------|
| id               | UUID (PK)   | Event identifier         |
| club_id          | UUID (FK)   | References clubs.id      |
| name             | Text        | Event name               |
| event_date       | Date        | Event date               |
| start_time       | Time        | Start time               |
| max_attendees    | Integer     | Capacity                 |
| dj_name          | Text        | DJ name                  |
| banner_image_url | Text        | Banner image URL         |

**`event_ticket_pricing`** — Ticket pricing tiers

| Column       | Type        | Description              |
|--------------|-------------|--------------------------|
| id           | UUID (PK)   | Pricing tier identifier  |
| event_id     | UUID (FK)   | References events.id     |
| label        | Text        | Tier name (e.g. "Before 11 PM") |
| stag_price   | Decimal     | Price for single entry   |
| couple_price | Decimal     | Price for couple entry   |

**`bookings`** — Booking records

| Column              | Type        | Description              |
|---------------------|-------------|--------------------------|
| id                  | UUID (PK)   | Booking identifier       |
| user_id             | UUID (FK)   | References users.id      |
| event_id            | UUID (FK)   | References events.id     |
| participants        | JSONB       | Participant details      |
| total_amount        | Decimal     | Total booking amount     |
| money_saved         | Decimal     | Discount amount applied  |
| booking_status      | Enum        | `pending`, `confirmed`, `cancelled` |
| razorpay_order_id   | Text        | Razorpay order reference |
| qr_code             | Text        | Base64 QR code data URL  |
| entry_status        | Enum        | `not_entered`, `entered` |

**`staff`** — Staff members

| Column    | Type        | Description              |
|-----------|-------------|--------------------------|
| id        | UUID (FK)   | References users.id      |
| club_id   | UUID (FK)   | References clubs.id      |
| club_name | Text        | Associated club name     |
| status    | Enum        | `pending`, `approved`, `rejected` |

---

## API Documentation

### Authentication

All protected endpoints require a Bearer token:

```
Authorization: Bearer <supabase_access_token>
```

### Endpoints

#### Events

| Method | Endpoint                | Description                              |
|--------|------------------------|------------------------------------------|
| GET    | `/api/events`          | List events with filters (lat, lng, radius, date) |
| GET    | `/api/events/[id]`     | Event details with pricing and club info |
| POST   | `/api/events`          | Create event (club owners only)          |
| PATCH  | `/api/events/patch`    | Update event details                     |
| DELETE | `/api/events/delete`   | Delete event                             |

#### Bookings

| Method | Endpoint                   | Description                              |
|--------|---------------------------|------------------------------------------|
| POST   | `/api/bookings/create`    | Create booking with participants         |
| GET    | `/api/bookings/event/[id]`| Event pricing and availability           |

#### Payments

| Method | Endpoint                              | Description                    |
|--------|--------------------------------------|--------------------------------|
| POST   | `/api/payments/checkout/create-order`| Create Razorpay order          |
| POST   | `/api/payments/verify`               | Verify payment and generate QR |

#### Clubs

| Method | Endpoint             | Description                 |
|--------|---------------------|-----------------------------|
| GET    | `/api/clubs/[id]`   | Club details with events    |
| GET    | `/api/clubs/nearby`  | Nearby clubs (lat, lng, radius) |

#### Map

| Method | Endpoint            | Description                 |
|--------|--------------------|-----------------------------|
| GET    | `/api/map/heatmap` | Heatmap data for map        |
| GET    | `/api/map/nearby`  | Nearby events for markers   |

#### Auth

| Method | Endpoint                        | Description             |
|--------|---------------------------------|-------------------------|
| POST   | `/api/auth/send-whatsapp-otp`  | Send OTP via WhatsApp   |
| POST   | `/api/auth/verify-whatsapp-otp`| Verify OTP and create session |

---

## Payment Integration

### Razorpay Flow

1. Backend creates Razorpay order with booking amount
2. Mobile app opens Razorpay native payment screen
3. User completes payment
4. Backend verifies payment signature
5. QR code generated and stored in booking
6. User sees success page with QR code

### Pricing Logic

The system supports two pricing modes per tier:

- **Stag Pricing** — Price for single entries
- **Couple Pricing** — Price for couple entries

Pricing is automatically calculated based on participant gender distribution and the selected time-based tier.

---

## Deployment

### Mobile App

```bash
# iOS
cd myApp
eas build --platform ios
eas submit --platform ios

# Android
cd myApp
eas build --platform android
eas submit --platform android
```

### Web Backend

**Vercel (recommended)**

```bash
cd web
vercel deploy
```

**Docker**

```bash
cd web
docker build -t bassh-web .
docker run -p 3000:3000 --env-file .env bassh-web
```

Set all environment variables in your deployment platform (Vercel Project Settings or EAS secrets).

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

### Code Style

- TypeScript for type safety
- Follow ESLint configuration
- Descriptive commit messages

---

## License

[Your License Here]
