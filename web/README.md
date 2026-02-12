# Bassh Web — Backend API & Admin Dashboard

The `web/` directory contains the Next.js application that serves as both the **REST API backend** for the mobile app and the **admin dashboard** for club owners. It handles authentication, event management, booking processing, payments, notifications, and all server-side business logic.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Directory Structure](#directory-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [API Architecture](#api-architecture)
- [API Endpoints](#api-endpoints)
- [Dashboard Pages](#dashboard-pages)
- [Services & Utilities](#services--utilities)
- [Authentication](#authentication)
- [Third-Party Integrations](#third-party-integrations)
- [Docker](#docker)
- [Deployment](#deployment)

---

## Tech Stack

| Layer          | Technology       | Version  | Purpose                               |
|----------------|------------------|----------|---------------------------------------|
| Framework      | Next.js          | 16.1.3   | App Router, API routes, SSR           |
| Runtime        | React            | 19.2.3   | UI rendering                          |
| Language       | TypeScript       | 5        | Type safety                           |
| Database       | Supabase         | 2.90+    | PostgreSQL database & auth            |
| Payments       | Razorpay         | 2.9.6    | Payment order creation & verification |
| SMS/OTP        | Twilio           | 5.12.0   | WhatsApp OTP delivery                 |
| Cache          | Upstash Redis    | 1.36.1   | Caching & rate limiting               |
| Cache (alt)    | ioredis          | 5.9.2    | Direct Redis connection               |
| Charts         | Recharts         | 3.7.0    | Dashboard analytics charts            |
| QR Codes       | qrcode           | 1.5.4    | Booking QR code generation            |
| PDF            | pdfkit           | 0.17.2   | Billing PDF export                    |
| Styling        | Tailwind CSS     | 4        | Utility-first CSS framework           |
| Icons          | lucide-react     | 0.563    | Dashboard icons                       |
| Maps           | Google Maps API  | 2.20.8   | Club location picker                  |

---

## Directory Structure

```
web/
├── app/
│   ├── layout.tsx                     # Root layout (HTML shell, fonts, global CSS)
│   ├── page.tsx                       # Landing / home page
│   ├── globals.css                    # Global styles & Tailwind imports
│   ├── favicon.ico
│   │
│   ├── api/                           # ── REST API Endpoints ──
│   │   │
│   │   ├── auth/                      # Authentication
│   │   │   ├── send-otp/             # POST — Send SMS OTP
│   │   │   ├── verify-otp/           # POST — Verify SMS OTP
│   │   │   ├── send-whatsapp-otp/    # POST — Send WhatsApp OTP (Twilio)
│   │   │   ├── verify-whatsapp-otp/  # POST — Verify WhatsApp OTP
│   │   │   └── save-phone/           # POST — Save phone to user profile
│   │   │
│   │   ├── bookings/                  # Booking Management
│   │   │   ├── create/               # POST — Create booking with participants
│   │   │   ├── [id]/                 # GET — Booking details by ID
│   │   │   ├── [id]/cancel/          # POST — Cancel a booking
│   │   │   ├── event/[id]/           # GET — Event pricing & availability
│   │   │   ├── my-bookings/          # GET — Current user's bookings
│   │   │   └── table/create/         # POST — Create table booking
│   │   │
│   │   ├── events/                    # Event Management
│   │   │   ├── [id]/                 # GET — Event details with pricing
│   │   │   ├── [id]/discounts/       # GET — Discounts for event
│   │   │   ├── [id]/guest-list/      # GET/POST — Guest list for event
│   │   │   ├── club/                 # GET — Events for a specific club
│   │   │   ├── delete/              # DELETE — Delete event
│   │   │   ├── delete-image/        # POST — Delete event image
│   │   │   └── attendees/           # GET — Event attendee list
│   │   │
│   │   ├── payments/                  # Payment Processing
│   │   │   ├── checkout/            # POST — Create Razorpay order
│   │   │   ├── verify/              # POST — Verify payment signature + generate QR
│   │   │   ├── event/               # POST — Event-specific payment
│   │   │   ├── table/               # POST — Table payment
│   │   │   ├── bill/                # GET — Bill details
│   │   │   └── wallet/              # GET — Wallet info
│   │   │
│   │   ├── club/                      # Club Owner Operations (authenticated)
│   │   │   ├── revenue/             # GET — Revenue data & trends
│   │   │   ├── location/            # GET/POST — Club location
│   │   │   ├── visuals/             # GET — Club images
│   │   │   ├── events/upcoming/     # GET — Upcoming events
│   │   │   ├── discounts/           # GET/POST — Club discounts
│   │   │   ├── bookings/            # GET — Club bookings
│   │   │   ├── payouts/history/     # GET — Payout history
│   │   │   ├── billing/pdf/         # GET — Generate billing PDF
│   │   │   ├── billing/summary/     # GET — Billing summary
│   │   │   └── timing/              # GET — Operational hours
│   │   │
│   │   ├── clubs/                     # Public Club Queries
│   │   │   └── [id]/nearby/         # GET — Nearby clubs
│   │   │
│   │   ├── discounts/                 # Discount Management
│   │   │   ├── club/                # GET — Discounts by club
│   │   │   ├── event/               # GET — Discounts by event
│   │   │   ├── on_bill/             # POST — Apply discount on bill
│   │   │   ├── delete/              # DELETE — Remove discount
│   │   │   └── update/              # PATCH — Update discount
│   │   │
│   │   ├── map/                       # Map & Discovery Data
│   │   │   ├── heatmap/             # GET — Heatmap data points
│   │   │   ├── heatmap/live/        # GET — Live heatmap data
│   │   │   ├── heatmap/nearby/      # GET — Nearby heatmap
│   │   │   └── nearby/              # GET — Nearby events
│   │   │
│   │   ├── notifications/             # Notification System
│   │   │   ├── send/                # POST — Send to single user
│   │   │   ├── send-bulk/           # POST — Send to multiple users
│   │   │   └── send-all/            # POST — Send to all users
│   │   │
│   │   ├── bookmarks/                 # Bookmarks
│   │   │   ├── save/                # POST — Save bookmark
│   │   │   ├── fetch/               # GET — Fetch user bookmarks
│   │   │   └── check/               # GET — Check if bookmarked
│   │   │
│   │   ├── guests/                    # Guest List Management
│   │   ├── reviews/                   # Review System
│   │   ├── users/[id]/               # User Profile
│   │   ├── transactions/[id]/        # Transaction Details
│   │   ├── search/                    # Search (events + clubs)
│   │   ├── upload-image/              # Image Upload
│   │   └── health/                    # Health Check
│   │
│   ├── dashboard/                     # ── Admin Dashboard (Club Owners) ──
│   │   ├── layout.tsx                # Dashboard layout (Sidebar + TopBar)
│   │   ├── page.tsx                  # Main dashboard — revenue & booking overview
│   │   ├── loading.tsx               # Loading skeleton
│   │   │
│   │   ├── billing/                  # Billing & Payouts
│   │   │   ├── page.tsx             # Transaction history, PDF export, payout claims
│   │   │   └── components/          # Billing-specific components
│   │   │
│   │   ├── events/                   # Event Management
│   │   │   ├── page.tsx             # Events overview
│   │   │   ├── manage/              # Create new event (form + image upload)
│   │   │   ├── viewAll/             # List all events
│   │   │   └── update/[eventId]/    # Edit existing event
│   │   │
│   │   ├── discount/[discountId]/   # Discount Code Management
│   │   ├── guest/                    # Guest List Management (approve, VIP, suspend)
│   │   ├── menu/                     # Club Menu Configuration
│   │   ├── contact/                  # Contact Management
│   │   │
│   │   └── settings/                 # Club Settings
│   │       ├── club_info/           # Basic club information
│   │       ├── op_details/          # Operational details (hours, capacity)
│   │       ├── visuals/             # Club images & branding
│   │       ├── legals/              # Legal policies & terms
│   │       └── components/          # Settings-shared components
│   │
│   ├── auth/                          # ── Authentication Pages ──
│   │   ├── login/                    # Login page
│   │   └── signUp/                   # Signup page
│   │
│   ├── components/                    # Shared UI Components
│   │   ├── ClubLocationPicker.tsx    # Google Maps location picker
│   │   ├── SideBar.tsx               # Dashboard sidebar navigation
│   │   └── TopBar.jsx                # Dashboard top navigation bar
│   │
│   └── services/                      # Backend Service Utilities
│       ├── auth-fetch.ts             # Authenticated fetch wrapper
│       ├── protected.ts              # Route protection middleware
│       ├── supabase-admin.ts         # Supabase admin client (SERVICE_ROLE_KEY)
│       └── supabase-public.ts        # Supabase public client (ANON_KEY)
│
├── lib/                               # Shared Library Instances
│   ├── razorpay.ts                   # Razorpay SDK instance
│   └── redis.ts                      # Redis/Upstash connection
│
├── types/                             # TypeScript Type Definitions
├── public/                            # Static Assets (SVGs, avatars)
├── supabase/                          # Supabase Project Configuration
├── scripts/                           # Build & Development Scripts
│
├── package.json                       # Dependencies & scripts
├── tsconfig.json                      # TypeScript configuration
├── next.config.js                     # Next.js configuration
├── eslint.config.mjs                  # ESLint rules
├── postcss.config.mjs                 # PostCSS (Tailwind) config
├── Dockerfile                         # Docker container config
└── .gitignore                         # Git ignore rules
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- A Supabase project with the required tables (see root README for schema)
- Razorpay, Twilio, Mapbox, and Upstash Redis accounts

### Installation

```bash
cd web
npm install
```

### Configure Environment

Create a `.env` file in the `web/` directory (see [Environment Variables](#environment-variables) below).

### Run Development Server

```bash
npm run dev
```

The server starts at `http://localhost:3000`.

### Run with Docker

From the repository root:

```bash
docker-compose up --build web
```

Or standalone:

```bash
cd web
docker build -t bassh-web .
docker run -p 3000:3000 --env-file .env bassh-web
```

---

## Environment Variables

Create a `.env` file in the `web/` directory with the following variables:

### Supabase Configuration

| Variable                    | Required | Description                                               |
|-----------------------------|----------|-----------------------------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`  | Yes      | Your Supabase project URL (e.g., `https://xyz.supabase.co`) |
| `NEXT_PUBLIC_ANON_KEY`      | Yes      | Supabase anonymous/public key for client-side auth        |
| `SERVICE_ROLE_KEY`          | Yes      | Supabase service role key for admin operations (server-side only) |

### Twilio Configuration (WhatsApp OTP)

| Variable              | Required | Description                                       |
|-----------------------|----------|---------------------------------------------------|
| `TWILIO_ACCOUNT_SID`  | Yes      | Twilio Account SID (starts with `AC`)             |
| `TWILIO_AUTH_TOKEN`    | Yes      | Twilio Auth Token                                 |
| `TWILIO_PHONE_NUMBER`  | Yes      | Twilio phone number for sending WhatsApp messages |

### Razorpay Configuration (Payments)

| Variable              | Required | Description                                    |
|-----------------------|----------|------------------------------------------------|
| `RAZORPAY_KEY_ID`     | Yes      | Razorpay Key ID (e.g., `rzp_test_...`)        |
| `RAZORPAY_KEY_SECRET` | Yes      | Razorpay Key Secret for signature verification |

### Redis Configuration (Upstash)

| Variable           | Required | Description                              |
|--------------------|----------|------------------------------------------|
| `REDIS_REST_URL`   | Yes      | Upstash Redis REST URL                   |
| `REDIS_REST_TOKEN` | Yes      | Upstash Redis REST authentication token  |

### Application Configuration

| Variable               | Required | Description                                              |
|------------------------|----------|----------------------------------------------------------|
| `NEXT_PUBLIC_APP_URL`  | Yes      | Deep link URL for mobile app redirect (e.g., `bassh://payment/redirect`) |

### Example `.env` file

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_ANON_KEY=your_anon_key
SERVICE_ROLE_KEY=your_service_role_key

TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret

NEXT_PUBLIC_APP_URL=bassh://payment/redirect
REDIS_REST_URL=https://your-redis.upstash.io
REDIS_REST_TOKEN=your_redis_token
```

---

## Available Scripts

| Command         | Description                            |
|-----------------|----------------------------------------|
| `npm run dev`   | Start Next.js development server       |
| `npm run build` | Create production build                |
| `npm start`     | Start development server (alias)       |
| `npm run lint`  | Run ESLint across the project          |

---

## API Architecture

All API endpoints live under `app/api/` and follow the Next.js App Router convention. Each endpoint is a `route.ts` file inside its directory.

### Request Authentication

Protected routes use the `protected.ts` service to verify Supabase JWT tokens:

```
Authorization: Bearer <supabase_access_token>
```

The `auth-fetch.ts` utility provides a wrapper for making authenticated server-side requests.

### Supabase Clients

Two Supabase client configurations are available:

- **`supabase-public.ts`** — Uses the anonymous key for client-side operations
- **`supabase-admin.ts`** — Uses the service role key for admin operations (bypasses Row Level Security)

### Shared Libraries

- **`lib/razorpay.ts`** — Singleton Razorpay SDK instance configured with `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`
- **`lib/redis.ts`** — Redis connection via Upstash REST client or ioredis

---

## API Endpoints

For a complete list of all API endpoints with methods and descriptions, see the [API Documentation section in the root README](../README.md#api-documentation).

### Endpoint Categories

| Category        | Base Path             | Description                                   |
|-----------------|-----------------------|-----------------------------------------------|
| Authentication  | `/api/auth/`          | OTP send/verify via SMS and WhatsApp          |
| Bookings        | `/api/bookings/`      | Create, cancel, fetch bookings                |
| Events          | `/api/events/`        | CRUD operations, guest lists, attendees       |
| Payments        | `/api/payments/`      | Checkout, verification, billing, wallet       |
| Club Ops        | `/api/club/`          | Revenue, location, discounts, payouts (owner) |
| Club Queries    | `/api/clubs/`         | Public club details and nearby search         |
| Discounts       | `/api/discounts/`     | CRUD for discount codes                       |
| Map Data        | `/api/map/`           | Heatmap data and nearby events                |
| Notifications   | `/api/notifications/` | Send to individual, bulk, or all users        |
| Bookmarks       | `/api/bookmarks/`     | Save, fetch, and check bookmarks              |
| Search          | `/api/search/`        | Full-text search across events and clubs      |
| Users           | `/api/users/`         | User profile management                       |
| Health          | `/api/health/`        | Server health check                           |

---

## Dashboard Pages

The admin dashboard is accessible at `/dashboard` and is designed for club owners. It uses a sidebar layout (`SideBar.tsx`) with a top navigation bar (`TopBar.jsx`).

| Page                          | Route                              | Description                                          |
|-------------------------------|------------------------------------|------------------------------------------------------|
| Overview                      | `/dashboard`                       | Revenue trends, booking count, daily metrics         |
| Billing & Payouts             | `/dashboard/billing`               | Transaction history, PDF export, payout claims       |
| Create Event                  | `/dashboard/events/manage`         | Event creation form with image upload, pricing tiers |
| View All Events               | `/dashboard/events/viewAll`        | List and manage existing events                      |
| Edit Event                    | `/dashboard/events/update/[id]`    | Update event details and images                      |
| Discount Management           | `/dashboard/discount/[id]`         | Create and manage discount codes                     |
| Guest List                    | `/dashboard/guest`                 | Approve, VIP, suspend guest list entries             |
| Menu                          | `/dashboard/menu`                  | Configure club menu items                            |
| Contact                       | `/dashboard/contact`               | Contact management                                   |
| Settings — Club Info          | `/dashboard/settings/club_info`    | Basic club information                               |
| Settings — Operational Details| `/dashboard/settings/op_details`   | Hours, capacity, operational config                  |
| Settings — Visuals            | `/dashboard/settings/visuals`      | Club images and branding                             |
| Settings — Legal              | `/dashboard/settings/legals`       | Legal policies and terms of service                  |

---

## Services & Utilities

### `app/services/`

| File                 | Purpose                                                        |
|----------------------|----------------------------------------------------------------|
| `auth-fetch.ts`      | Authenticated fetch wrapper — attaches JWT token to requests   |
| `protected.ts`       | Route protection — verifies JWT and extracts user info         |
| `supabase-admin.ts`  | Supabase client with service role key (bypasses RLS)           |
| `supabase-public.ts` | Supabase client with anonymous key (respects RLS)              |

### `lib/`

| File            | Purpose                                             |
|-----------------|-----------------------------------------------------|
| `razorpay.ts`   | Razorpay SDK singleton instance                     |
| `redis.ts`      | Redis connection (Upstash REST or ioredis)          |

---

## Authentication

Authentication is handled via Supabase Auth with OTP verification:

1. User requests OTP via `/api/auth/send-whatsapp-otp` (or SMS variant)
2. Twilio delivers the OTP to the user's WhatsApp
3. User submits OTP to `/api/auth/verify-whatsapp-otp`
4. Supabase Auth creates/verifies the user and returns JWT tokens
5. Subsequent API calls include `Authorization: Bearer <token>` header
6. Protected API routes use `protected.ts` to validate the token and extract user identity

### User Roles

| Role    | Access                                           |
|---------|--------------------------------------------------|
| `user`  | Mobile app — event discovery, booking, profile   |
| `staff` | Mobile app — staff-specific screens after approval |
| `club`  | Web dashboard — full club management             |

---

## Third-Party Integrations

### Razorpay (Payments)

- **Order creation**: `lib/razorpay.ts` creates payment orders with amount and currency
- **Verification**: Payment signature verified using HMAC SHA256
- **QR generation**: On successful payment, a QR code is generated via the `qrcode` library and stored in the booking

### Twilio (WhatsApp OTP)

- Sends OTP codes via WhatsApp using the Twilio API
- Configured with Account SID, Auth Token, and phone number
- Used during the authentication flow for phone number verification

### Supabase (Database & Auth)

- PostgreSQL database for all data storage
- Row Level Security (RLS) policies for data access control
- Auth system for JWT-based authentication
- Storage for image uploads

### Upstash Redis (Caching)

- REST-based Redis for caching and rate limiting
- Alternative direct connection via ioredis

### Google Maps (Location Picker)

- `ClubLocationPicker.tsx` component uses `@react-google-maps/api`
- Allows club owners to set their venue location on a map

---

## Docker

The web service has its own `Dockerfile` using Node 20 Alpine:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]
```

### Standalone Docker

```bash
docker build -t bassh-web .
docker run -p 3000:3000 --env-file .env bassh-web
```

### Via Docker Compose (from repo root)

```bash
docker-compose up --build web
```

The service runs on port **3000** with hot-reloading enabled via volume mounts.

---

## Deployment

### Vercel (Recommended)

```bash
vercel deploy
```

Set all environment variables in the Vercel Project Settings dashboard.

### Docker (Self-hosted)

```bash
docker build -t bassh-web .
docker run -p 3000:3000 --env-file .env bassh-web
```

### Next.js Configuration

The `next.config.js` enables:
- **Image optimization** with remote patterns for `images.unsplash.com` and `*.supabase.co`
- **App Router** with all standard Next.js 16 features

### TypeScript Configuration

- **Target**: ES2017
- **Strict mode** enabled
- **Path alias**: `@/*` maps to `./` for clean imports
