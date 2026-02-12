# Bassh

**Event Discovery & Booking Platform**

Bassh connects users with nightlife events, clubs, and entertainment venues. The platform provides real-time event discovery via interactive maps, seamless ticket booking with smart pricing, and a full admin dashboard for club owners to manage their business.

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Features](#features)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Docker Setup](#docker-setup)
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
         │                           │                           │
         │                           │                           │
         v                           v                           v
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│  Razorpay SDK   │         │  Razorpay API   │         │  Supabase Auth  │
│  (Native iOS/   │         │   (Payments)    │         │   (JWT Tokens)  │
│   Android)      │         │                 │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
                                     │
                            ┌────────┴────────┐
                            │                 │
                            v                 v
                    ┌──────────────┐  ┌──────────────┐
                    │    Twilio    │  │    Redis     │
                    │ (WhatsApp   │  │  (Upstash    │
                    │   OTP)      │  │   Cache)     │
                    └──────────────┘  └──────────────┘
```

### Component Flow

1. **Authentication** — Supabase Auth issues JWT tokens; OTP verification via Twilio (WhatsApp)
2. **Event Discovery** — Map-based search queries nearby events API with Mapbox heatmap visualization
3. **Booking Flow** — Event selection, participant details, gender-based price calculation, payment
4. **Payment Processing** — Razorpay order creation on backend, native SDK payment on mobile, signature verification, QR code generation
5. **Admin Dashboard** — Club owners manage events, bookings, discounts, guest lists, billing, and settings via the web dashboard

---

## Tech Stack

### Mobile App (`myApp/`)

| Layer          | Technology                            |
|----------------|---------------------------------------|
| Framework      | Expo ~54.0 (React Native 0.81)        |
| Navigation     | Expo Router v6 (file-based routing)   |
| Maps           | Mapbox (@rnmapbox/maps 10.2.10)       |
| Auth           | Supabase JS SDK 2.91                  |
| Payments       | react-native-razorpay (native SDK)    |
| UI             | Bottom Sheet, Reanimated, Gesture Handler |
| QR Codes       | react-native-qrcode-svg               |
| Language       | TypeScript 5.9                        |

### Web Backend & Dashboard (`web/`)

| Layer          | Technology                            |
|----------------|---------------------------------------|
| Framework      | Next.js 16.1 (App Router)             |
| Database       | Supabase (PostgreSQL)                 |
| Auth           | Supabase Auth with JWT                |
| Payments       | Razorpay Node.js SDK 2.9              |
| Charts         | Recharts 3.7                          |
| QR Generation  | qrcode 1.5                            |
| PDF Generation | pdfkit 0.17                           |
| SMS/OTP        | Twilio 5.12 (WhatsApp OTP)            |
| Styling        | Tailwind CSS 4                        |
| Cache          | Redis (ioredis / Upstash)             |
| Icons          | lucide-react                          |
| Language       | TypeScript 5                          |

### Infrastructure

- **Database** — Supabase PostgreSQL
- **Authentication** — Supabase Auth (JWT-based)
- **Storage** — Supabase Storage (images)
- **Payment Gateway** — Razorpay
- **SMS/OTP** — Twilio (WhatsApp)
- **Caching** — Upstash Redis
- **Containerization** — Docker & Docker Compose

---

## Repository Structure

This is a monorepo with two main applications and shared Docker orchestration at the root.

```
Bassh/
├── README.md                       # This file — project overview
├── docker-compose.yml              # Docker orchestration for both services
├── .gitignore                      # Root git ignore rules
├── .dockerignore                   # Docker ignore rules
│
├── myApp/                          # React Native mobile app (Expo)
│   ├── app/                        # Expo Router pages (file-based routing)
│   │   ├── _layout.tsx             # Root layout with auth guard
│   │   ├── (auth)/                 # Auth group — login & signup screens
│   │   ├── (tabs)/                 # Tab navigation — Home, Events, Booking, Profile
│   │   ├── event/[id]/             # Event detail & booking screens
│   │   ├── booking/                # Booking flow screens
│   │   ├── payment/                # Payment success screen
│   │   ├── onboarding/             # New user onboarding flow
│   │   ├── club/[clubId]/          # Club detail screens
│   │   ├── staff/                  # Staff registration screens
│   │   ├── category/               # Event category browsing
│   │   ├── transaction/            # Transaction history
│   │   └── components/             # Screen-level shared components
│   ├── _services/                  # API config, auth fetch, Supabase client
│   ├── components/                 # Reusable UI components
│   ├── hooks/                      # Custom React hooks
│   ├── constants/                  # App constants (colors, theme)
│   ├── services/                   # Additional service utilities
│   ├── assets/                     # Images, icons, splash screen
│   ├── app.json                    # Expo configuration
│   ├── eas.json                    # Expo Application Services config
│   ├── package.json                # Dependencies & scripts
│   ├── Dockerfile                  # Container config
│   └── README.md                   # Mobile app documentation
│
├── web/                            # Next.js backend API & admin dashboard
│   ├── app/
│   │   ├── api/                    # REST API endpoints (~40+ routes)
│   │   │   ├── auth/               # OTP send/verify (SMS & WhatsApp)
│   │   │   ├── bookings/           # Create, cancel, fetch bookings
│   │   │   ├── events/             # Event CRUD, attendees, guest lists
│   │   │   ├── payments/           # Checkout, verify, billing, wallet
│   │   │   ├── club/               # Club operations, revenue, payouts
│   │   │   ├── clubs/              # Club queries (details, nearby)
│   │   │   ├── discounts/          # Discount CRUD
│   │   │   ├── map/                # Heatmap & nearby event data
│   │   │   ├── notifications/      # Send single, bulk, all notifications
│   │   │   ├── bookmarks/          # Save, fetch, check bookmarks
│   │   │   ├── guests/             # Guest list management
│   │   │   ├── reviews/            # Review system
│   │   │   ├── search/             # Search functionality
│   │   │   ├── users/              # User management
│   │   │   ├── upload-image/       # Image upload
│   │   │   └── health/             # Health check endpoint
│   │   ├── dashboard/              # Admin dashboard (club owners)
│   │   │   ├── billing/            # Billing & payouts
│   │   │   ├── events/             # Event management (create, view, update)
│   │   │   ├── discount/           # Discount code management
│   │   │   ├── guest/              # Guest list management
│   │   │   ├── menu/               # Menu configuration
│   │   │   ├── contact/            # Contact management
│   │   │   └── settings/           # Club settings (info, location, visuals, legal)
│   │   ├── auth/                   # Login & signup pages
│   │   ├── components/             # Shared UI components (Sidebar, TopBar)
│   │   └── services/               # Backend utilities (auth-fetch, Supabase)
│   ├── lib/                        # Shared libraries (Razorpay, Redis)
│   ├── types/                      # TypeScript type definitions
│   ├── public/                     # Static assets
│   ├── supabase/                   # Supabase configuration
│   ├── scripts/                    # Build & dev scripts
│   ├── package.json                # Dependencies & scripts
│   ├── Dockerfile                  # Container config
│   └── README.md                   # Web app documentation
```

> For detailed documentation of each sub-project, see:
> - [Mobile App Documentation](./myApp/README.md)
> - [Web Backend & Dashboard Documentation](./web/README.md)

---

## Features

### Users (Mobile App)

- **Interactive Map** — Location-based event discovery with Mapbox heatmap visualization
- **Event Discovery** — Browse and filter by category, age limit, DJ, date, time, and capacity
- **Real-time Search** — Instant search across events and clubs
- **Ticket Booking** — Multi-participant booking with age validation
- **Smart Pricing** — Automatic stag/couple pricing based on participant gender distribution
- **Payment Processing** — Secure Razorpay payment integration (native SDK)
- **QR Code Entry** — Digital QR codes generated on successful booking
- **Booking History** — View past and upcoming bookings
- **Wallet** — Quick-add wallet with ongoing event cards
- **Club Filtering** — Filter clubs by tier, rating, price range, and guest count
- **Bookmarks** — Save favourite events and clubs
- **Notifications** — In-app notifications for booking confirmations and updates
- **Onboarding** — Guided setup for new users

### Staff (Mobile App)

- **Staff Registration** — Separate signup flow with club association
- **Club Association** — Join club workflow with approval system
- **Status Tracking** — Pending / Approved / Rejected status management

### Club Owners (Web Dashboard)

- **Revenue Dashboard** — Real-time revenue tracking with trend charts (Recharts)
- **Booking Analytics** — Current bookings with daily change metrics
- **Event Management** — Create, update, and delete events with image uploads
- **Pricing Tiers** — Configure multiple ticket pricing tiers (stag/couple by time slot)
- **Discount Management** — Create and manage discount codes with scheduling
- **Guest List** — Manage guest lists with approval, VIP, and suspend actions
- **Billing & Payouts** — Transaction history, PDF invoice export, and payout claims
- **Menu Management** — Club menu configuration
- **Settings** — Club info, location picker (Google Maps), visuals, legal policies, and operational details
- **Notifications** — Send notifications to individual users, bulk, or all users

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Expo CLI** (`npm install -g expo-cli`) — for mobile development
- **Docker & Docker Compose** — optional, for containerized development
- **Supabase** account and project
- **Razorpay** account (test or live keys)
- **Mapbox** account (for map tokens)
- **Twilio** account (for WhatsApp OTP)

### Installation

**1. Clone the repository**

```bash
git clone <repository-url>
cd Bassh
```

**2. Install dependencies for both sub-projects**

```bash
# Mobile app
cd myApp
npm install

# Web backend (in a separate terminal)
cd web
npm install
```

**3. Configure environment variables**

Create `.env` files in both `myApp/` and `web/` directories. See the [Environment Variables](#environment-variables) section below for required values.

**4. Run with Docker (recommended)**

```bash
# From the repository root
docker-compose up --build
```

This starts:
- Expo dev server on `http://localhost:8081`
- Next.js server on `http://localhost:3000`

**5. Run locally (alternative)**

```bash
# Terminal 1 — Mobile app
cd myApp
npm start

# Terminal 2 — Web backend
cd web
npm run dev
```

---

## Environment Variables

Each sub-project requires its own `.env` file. For detailed descriptions of each variable, refer to the sub-project READMEs:
- [Mobile App Environment Setup](./myApp/README.md#environment-variables)
- [Web Backend Environment Setup](./web/README.md#environment-variables)

### Mobile App (`myApp/.env`)

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_ANON_KEY=your_anon_key
SERVICE_ROLE_KEY=your_service_role_key

EXPO_PUBLIC_API_URL=https://your-api.vercel.app/
EXPO_PUBLIC_MAPBOX_TOKEN=pk.your_public_token
EXPO_PUBLIC_MAPBOX_SECRET_TOKEN=sk.your_secret_token
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_your_id
```

### Web Backend (`web/.env`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_ANON_KEY=your_anon_key
SERVICE_ROLE_KEY=your_service_role_key

TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_number

RAZORPAY_KEY_ID=rzp_test_your_id
RAZORPAY_KEY_SECRET=your_secret

NEXT_PUBLIC_APP_URL=bassh://payment/redirect
REDIS_REST_URL=https://your-redis.upstash.io
REDIS_REST_TOKEN=your_redis_token
```

---

## Docker Setup

The project uses Docker Compose to orchestrate both services from the repository root.

### Services

| Service       | Container Name | Port | Description              |
|---------------|----------------|------|--------------------------|
| `expo`        | bassh-expo     | 8081 | Expo dev server (mobile) |
| `web`         | bassh-web      | 3000 | Next.js server (API + dashboard) |

Both services use Node 20 Alpine images, mount local source directories as volumes for hot-reloading, and read environment variables from their respective `.env` files.

### Commands

```bash
# Build and start all services
docker-compose up --build

# Start in detached mode
docker-compose up -d

# Stop all services
docker-compose down

# Rebuild a specific service
docker-compose up --build web
docker-compose up --build expo
```

---

## Database Schema

The application uses Supabase (PostgreSQL) with the following core tables.

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
| tier                | Text        | Club tier level          |
| rating              | Decimal     | Club rating              |

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

| Column       | Type        | Description                          |
|--------------|-------------|--------------------------------------|
| id           | UUID (PK)   | Pricing tier identifier              |
| event_id     | UUID (FK)   | References events.id                 |
| label        | Text        | Tier name (e.g. "Before 11 PM")     |
| stag_price   | Decimal     | Price for single entry               |
| couple_price | Decimal     | Price for couple entry               |

**`bookings`** — Booking records

| Column              | Type        | Description                                  |
|---------------------|-------------|----------------------------------------------|
| id                  | UUID (PK)   | Booking identifier                           |
| user_id             | UUID (FK)   | References users.id                          |
| event_id            | UUID (FK)   | References events.id                         |
| participants        | JSONB       | Participant details (name, gender, age)      |
| total_amount        | Decimal     | Total booking amount                         |
| money_saved         | Decimal     | Discount amount applied                      |
| booking_status      | Enum        | `pending`, `confirmed`, `cancelled`          |
| razorpay_order_id   | Text        | Razorpay order reference                     |
| qr_code             | Text        | Base64 QR code data URL                      |
| entry_status        | Enum        | `not_entered`, `entered`                     |

**`staff`** — Staff members

| Column    | Type        | Description                              |
|-----------|-------------|------------------------------------------|
| id        | UUID (FK)   | References users.id                      |
| club_id   | UUID (FK)   | References clubs.id                      |
| club_name | Text        | Associated club name                     |
| status    | Enum        | `pending`, `approved`, `rejected`        |

**Additional tables:** `discounts`, `transactions`, `notifications`, `reviews`, `bookmarks`

---

## API Documentation

All API endpoints are served from the Next.js backend under `/api/`. Protected endpoints require a Bearer token.

```
Authorization: Bearer <supabase_access_token>
```

### Authentication

| Method | Endpoint                         | Description                    |
|--------|----------------------------------|--------------------------------|
| POST   | `/api/auth/send-otp`             | Send OTP via SMS               |
| POST   | `/api/auth/verify-otp`           | Verify SMS OTP                 |
| POST   | `/api/auth/send-whatsapp-otp`    | Send OTP via WhatsApp          |
| POST   | `/api/auth/verify-whatsapp-otp`  | Verify WhatsApp OTP & create session |
| POST   | `/api/auth/save-phone`           | Save phone number to profile   |

### Events

| Method | Endpoint                         | Description                              |
|--------|----------------------------------|------------------------------------------|
| GET    | `/api/events/[id]`               | Event details with pricing and club info |
| POST   | `/api/events`                    | Create event (club owners only)          |
| PATCH  | `/api/events`                    | Update event details                     |
| DELETE | `/api/events/delete`             | Delete event                             |
| GET    | `/api/events/[id]/discounts`     | Get discounts for an event               |
| GET    | `/api/events/[id]/guest-list`    | Get guest list for an event              |
| GET    | `/api/events/club`               | Get events for a club                    |
| GET    | `/api/events/attendees`          | Get event attendees                      |

### Bookings

| Method | Endpoint                         | Description                              |
|--------|----------------------------------|------------------------------------------|
| POST   | `/api/bookings/create`           | Create booking with participants         |
| GET    | `/api/bookings/[id]`             | Get booking details                      |
| POST   | `/api/bookings/[id]/cancel`      | Cancel a booking                         |
| GET    | `/api/bookings/event/[id]`       | Event pricing and availability           |
| GET    | `/api/bookings/my-bookings`      | Get current user's bookings              |
| POST   | `/api/bookings/table/create`     | Create table booking                     |

### Payments

| Method | Endpoint                              | Description                    |
|--------|---------------------------------------|--------------------------------|
| POST   | `/api/payments/checkout`              | Create Razorpay order          |
| POST   | `/api/payments/verify`                | Verify payment and generate QR |
| POST   | `/api/payments/event`                 | Event payment processing       |
| POST   | `/api/payments/table`                 | Table payment processing       |
| GET    | `/api/payments/bill`                  | Get bill details               |
| GET    | `/api/payments/wallet`                | Get wallet information         |

### Clubs

| Method | Endpoint                         | Description                              |
|--------|----------------------------------|------------------------------------------|
| GET    | `/api/clubs/[id]`                | Club details                             |
| GET    | `/api/clubs/[id]/nearby`         | Nearby clubs                             |
| GET    | `/api/club/revenue`              | Revenue data (club owner)                |
| GET    | `/api/club/location`             | Club location data                       |
| GET    | `/api/club/events/upcoming`      | Upcoming events for club                 |
| GET    | `/api/club/discounts`            | Club discounts                           |
| GET    | `/api/club/bookings`             | Club bookings                            |
| GET    | `/api/club/payouts/history`      | Payout history                           |
| GET    | `/api/club/billing/pdf`          | Generate billing PDF                     |
| GET    | `/api/club/billing/summary`      | Billing summary                          |
| GET    | `/api/club/timing`               | Operational hours                        |
| GET    | `/api/club/visuals`              | Club images                              |

### Map & Discovery

| Method | Endpoint                         | Description                    |
|--------|----------------------------------|--------------------------------|
| GET    | `/api/map/heatmap`               | Heatmap data for map           |
| GET    | `/api/map/heatmap/live`          | Live heatmap data              |
| GET    | `/api/map/heatmap/nearby`        | Nearby heatmap data            |
| GET    | `/api/map/nearby`                | Nearby events for markers      |
| GET    | `/api/search`                    | Search events and clubs        |

### Other Endpoints

| Method | Endpoint                         | Description                    |
|--------|----------------------------------|--------------------------------|
| POST   | `/api/notifications/send`        | Send notification              |
| POST   | `/api/notifications/send-bulk`   | Send bulk notifications        |
| POST   | `/api/notifications/send-all`    | Send to all users              |
| POST   | `/api/bookmarks/save`            | Save bookmark                  |
| GET    | `/api/bookmarks/fetch`           | Fetch bookmarks                |
| GET    | `/api/bookmarks/check`           | Check bookmark status          |
| GET    | `/api/users/[id]`                | Get user profile               |
| GET    | `/api/transactions/[id]`         | Get transaction details        |
| GET    | `/api/health`                    | Health check                   |

---

## Payment Integration

### Razorpay Flow

1. Backend creates Razorpay order with calculated booking amount
2. Mobile app opens Razorpay native payment screen via `react-native-razorpay`
3. User completes payment (UPI, card, net banking, etc.)
4. Backend verifies payment signature using `razorpay_payment_id`, `razorpay_order_id`, and `razorpay_signature`
5. QR code is generated (via `qrcode` library) and stored in the booking record
6. User sees success page with downloadable QR code for venue entry

### Pricing Logic

The system supports multiple pricing tiers per event (e.g., "Before 11 PM", "After 11 PM"):

- **Stag Pricing** — Price for single entries
- **Couple Pricing** — Price for couple entries

Pricing is automatically calculated based on participant gender distribution and the selected time-based tier. Discounts can be applied via discount codes.

---

## Deployment

### Mobile App (EAS Build)

```bash
cd myApp

# iOS
eas build --platform ios
eas submit --platform ios

# Android
eas build --platform android
eas submit --platform android
```

### Web Backend (Vercel — recommended)

```bash
cd web
vercel deploy
```

### Web Backend (Docker)

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

- TypeScript is used throughout both sub-projects for type safety
- Follow the ESLint configuration in each sub-project
- Use descriptive commit messages
- Keep API route handlers in the Next.js `app/api/` directory following the App Router convention
- Mobile screens follow Expo Router file-based routing conventions

---

## License

[Your License Here]
