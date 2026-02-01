# Database Tables Schema

This document contains the complete schema for all database tables in the Bassh platform.

---

## Table of Contents

- [users](#users)
- [customers](#customers)
- [clubs](#clubs)
- [events](#events)
- [event_ticket_pricing](#event_ticket_pricing)
- [bookings](#bookings)
- [transactions](#transactions)
- [staff](#staff)
- [discounts](#discounts)
- [reviews](#reviews)
- [phone_otps](#phone_otps)

---

## users

Base user table that links to Supabase Auth.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | Primary Key | Links to Supabase Auth user ID |
| `email` | Text | | User email address |
| `role` | Enum | | User role: `'user'`, `'staff'`, `'club'` |
| `created_at` | Timestamp | | Record creation timestamp |
| `updated_at` | Timestamp | | Record last update timestamp |

**Relationships:**
- One-to-one with `customers` (via `id`)
- One-to-one with `staff` (via `id`)
- One-to-many with `bookings` (via `user_id`)

---

## customers

Customer profile information for regular users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | Primary Key, Foreign Key → `users.id` | Customer ID (same as user ID) |
| `email` | Text | | Customer email |
| `first_name` | Text | Optional | Customer first name |
| `last_name` | Text | Optional | Customer last name |
| `username` | Text | Optional | Customer username |
| `name` | Text | Optional | Full name (legacy field) |
| `gender` | Enum | Optional | Gender: `'male'`, `'female'`, `'other'`, `'prefer_not_to_say'` |
| `dob` | Date | Optional | Date of birth |
| `phone_number` | Text | Optional | Phone number |
| `instagram` | Text | Optional | Instagram handle |
| `twitter` | Text | Optional | Twitter handle |
| `social_handle` | Text | Optional | Social media handle (legacy field) |
| `avatar_url` | Text | Optional | URL to customer avatar image |
| `onboarding_completed` | Boolean | Optional | Whether onboarding is completed |
| `wallet_balance` | Numeric | NOT NULL, Default 0 | Current wallet balance in INR |
| `created_at` | Timestamp | | Record creation timestamp |
| `updated_at` | Timestamp | | Record last update timestamp |

**Relationships:**
- One-to-one with `users` (via `id`)
- One-to-many with `bookings` (via `user_id`)

---

## clubs

Club/venue information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | Primary Key | Club ID |
| `club_name` | Text | | Name of the club |
| `address_text` | Text | | Physical address of the club |
| `latitude` | Decimal | | Latitude coordinate |
| `longitude` | Decimal | | Longitude coordinate |
| `guest_count` | Integer | Optional | Maximum guest capacity |
| `description` | Text | Optional | Club description |
| `club_token` | Text | Optional | Unique token for staff to join club |
| `created_at` | Timestamp | | Record creation timestamp |
| `updated_at` | Timestamp | | Record last update timestamp |

**Relationships:**
- One-to-many with `events` (via `club_id`)
- One-to-many with `staff` (via `club_id`)

---

## events

Event information and details.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | Primary Key | Event ID |
| `club_id` | UUID | Foreign Key → `clubs.id` | Associated club |
| `name` | Text | | Event name |
| `categories` | Text Array | Optional | Event categories/tags |
| `about` | Text | Optional | Event description |
| `age_limit` | Integer | Optional | Minimum age requirement |
| `terms_and_conditions` | Text | Optional | Terms and conditions |
| `event_date` | Date | | Event date |
| `start_time` | Time | | Event start time |
| `max_attendees` | Integer | Optional | Maximum number of attendees |
| `dj_name` | Text | Optional | DJ name |
| `dj_instagram` | Text | Optional | DJ Instagram handle |
| `dj_image_url` | Text | Optional | URL to DJ image |
| `banner_image_url` | Text | Optional | URL to event banner image |
| `created_at` | Timestamp | | Record creation timestamp |
| `updated_at` | Timestamp | | Record last update timestamp |

**Relationships:**
- Many-to-one with `clubs` (via `club_id`)
- One-to-many with `event_ticket_pricing` (via `event_id`)
- One-to-many with `bookings` (via `event_id`)
- One-to-many with `discounts` (via `event_id`)

---

## event_ticket_pricing

Pricing tiers for events.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | Primary Key | Pricing tier ID |
| `event_id` | UUID | Foreign Key → `events.id` | Associated event |
| `label` | Text | | Pricing tier label (e.g., "Early Bird", "VIP") |
| `price` | Decimal | | Base price |
| `stag_price` | Decimal | Optional | Price for single male attendees |
| `couple_price` | Decimal | Optional | Price for couples |

**Relationships:**
- Many-to-one with `events` (via `event_id`)

---

## bookings

Booking records for event tickets.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | Primary Key | Booking ID |
| `user_id` | UUID | Foreign Key → `users.id` | Customer who made the booking |
| `event_id` | UUID | Foreign Key → `events.id` | Event being booked |
| `club_id` | UUID | Foreign Key → `clubs.id` | Club hosting the event |
| `participants` | JSONB Array | | Array of participant details (name, age, gender, etc.) |
| `total_amount` | Decimal | | Total booking amount |
| `money_saved` | Decimal | Optional, Default 0 | Discount amount applied at booking (shown on payment success) |
| `booking_date` | Date | | Date of the booking (usually same as event date) |
| `booking_time` | Time | | Time of the booking (usually same as event start time) |
| `booking_status` | Enum | | Status: `'pending'`, `'confirmed'`, `'cancelled'` |
| `razorpay_order_id` | Text | Optional | Razorpay order ID |
| `razorpay_payment_id` | Text | Optional | Razorpay payment ID |
| `razorpay_signature` | Text | Optional | Razorpay payment signature |
| `qr_code` | Text | Optional | Base64 data URL of QR code |
| `entry_status` | Enum | | Entry status: `'not_entered'`, `'entered'` |
| `entered_at` | Timestamp | Optional | Timestamp when entry was marked |
| `qr_used` | Boolean | Optional | Whether QR code has been used |
| `qr_used_at` | Timestamp | Optional | Timestamp when QR code was used |
| `created_at` | Timestamp | | Record creation timestamp |
| `updated_at` | Timestamp | | Record last update timestamp |

**Relationships:**
- Many-to-one with `users` (via `user_id`)
- Many-to-one with `events` (via `event_id`)
- Many-to-one with `clubs` (via `club_id`)

---

## transactions

Payment transaction records for both event bookings, direct bill (cover) payments, and wallet top-ups.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | Primary Key | Transaction ID |
| `user_id` | UUID | Foreign Key → `users.id` | User who made the payment |
| `club_id` | UUID | Foreign Key → `clubs.id`, Nullable | Club receiving the payment (null for wallet top-ups) |
| `event_id` | UUID | Foreign Key → `events.id`, Nullable | Event (null for bill/cover/wallet payments) |
| `booking_id` | UUID | Foreign Key → `bookings.id`, Nullable | Booking (null for bill/cover/wallet payments) |
| `razorpay_order_id` | Text | Optional | Razorpay order ID |
| `razorpay_payment_id` | Text | Optional | Razorpay payment ID |
| `amount` | Decimal | | Payment amount |
| `status` | Enum | | Status: `'pending'`, `'success'`, `'failed'` |
| `is_wallet` | Boolean | NOT NULL, Default false | True when this is a wallet-related transaction |
| `wallet_added` | Boolean | Optional | True when money was credited to wallet |
| `wallet_used` | Boolean | Optional | True when wallet balance was debited for payment |
| `created_at` | Timestamp | | Record creation timestamp |
| `updated_at` | Timestamp | | Record last update timestamp |

**Relationships:**
- Many-to-one with `users` (via `user_id`)
- Many-to-one with `clubs` (via `club_id`)
- Many-to-one with `events` (via `event_id`), optional
- Many-to-one with `bookings` (via `booking_id`), optional

**Notes:**
- Event ticket payments: `booking_id` and `event_id` set; transaction may be created on verify.
- Bill/cover payments: `booking_id` and `event_id` are null; record created before Razorpay order.
- Wallet top-ups: `club_id`, `booking_id`, `event_id` are null; `is_wallet=true`; on verify, `wallet_added=true` and `customers.wallet_balance` is incremented.
- Wallet payments: when paying with wallet, `wallet_used=true` and `customers.wallet_balance` is decremented.

---

## staff

Staff member information and club associations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | Primary Key, Foreign Key → `users.id` | Staff ID (same as user ID) |
| `club_id` | UUID | Foreign Key → `clubs.id`, Nullable | Associated club ID |
| `club_name` | Text | Nullable | Club name (denormalized) |
| `status` | Enum | | Status: `'pending'`, `'approved'`, `'rejected'` |
| `post` | Text | Optional | Staff position/post (e.g., "staff", "manager") |
| `created_at` | Timestamp | | Record creation timestamp |
| `updated_at` | Timestamp | | Record last update timestamp |

**Relationships:**
- One-to-one with `users` (via `id`)
- Many-to-one with `clubs` (via `club_id`)

---

## discounts

Discount information for events.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | Primary Key | Discount ID |
| `event_id` | UUID | Foreign Key → `events.id` | Associated event |
| `discount_code` | Text | Optional | Discount code |
| `discount_percentage` | Decimal | Optional | Discount percentage |
| `discount_amount` | Decimal | Optional | Fixed discount amount |
| `is_active` | Boolean | | Whether discount is active |
| `start_date` | Date | | Discount start date |
| `end_date` | Date | | Discount end date |
| `applicable_days` | Integer Array | Optional | Days of week when discount applies (1=Mon, 2=Tue, ..., 7=Sun) |
| `created_at` | Timestamp | | Record creation timestamp |
| `updated_at` | Timestamp | | Record last update timestamp |

**Relationships:**
- Many-to-one with `events` (via `event_id`)

---

## reviews

User reviews for clubs, optionally linked to an event or booking.

```sql
create table public.reviews (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null,
  club_id uuid not null,
  event_id uuid null,
  booking_id uuid null,

  rating int not null check (rating between 1 and 5),
  comment text,

  is_verified boolean default false,
  is_hidden boolean default false,
  hidden_reason text,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint reviews_user_fk
    foreign key (user_id)
    references auth.users (id)
    on delete cascade,

  constraint reviews_club_fk
    foreign key (club_id)
    references clubs (id)
    on delete cascade,

  constraint reviews_event_fk
    foreign key (event_id)
    references events (id)
    on delete cascade,

  constraint reviews_booking_fk
    foreign key (booking_id)
    references bookings (id)
    on delete set null
);
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | Primary Key | Review ID |
| `user_id` | UUID | Foreign Key → `auth.users.id` | User who wrote the review |
| `club_id` | UUID | Foreign Key → `clubs.id` | Club being reviewed |
| `event_id` | UUID | Foreign Key → `events.id`, Nullable | Event (optional context) |
| `booking_id` | UUID | Foreign Key → `bookings.id`, Nullable | Booking (optional context) |
| `rating` | Integer | Check 1–5 | Star rating (1 to 5) |
| `comment` | Text | Optional | Review text |
| `is_verified` | Boolean | Default false | Whether review is verified (e.g. from a booking) |
| `is_hidden` | Boolean | Default false | Whether review is hidden from display |
| `hidden_reason` | Text | Optional | Reason the review was hidden |
| `created_at` | Timestamp | | Record creation timestamp |
| `updated_at` | Timestamp | | Record last update timestamp |

**Relationships:**
- Many-to-one with `auth.users` (via `user_id`) — on delete cascade
- Many-to-one with `clubs` (via `club_id`) — on delete cascade
- Many-to-one with `events` (via `event_id`), optional — on delete cascade
- Many-to-one with `bookings` (via `booking_id`), optional — on delete set null

---

## phone_otps

Phone number OTP verification records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | Primary Key | OTP record ID |
| `phone` | Text | | Phone number |
| `otp` | Text | Optional | OTP code (plain text, for verification) |
| `otp_hash` | Text | | Hashed OTP (SHA256) |
| `verified` | Boolean | Optional | Whether OTP has been verified |
| `expires_at` | Timestamp | | OTP expiration timestamp |
| `created_at` | Timestamp | | Record creation timestamp |
| `updated_at` | Timestamp | | Record last update timestamp |

**Notes:**
- OTPs expire after 5 minutes
- Used for WhatsApp OTP verification flow

---

## Storage Buckets

### event-images

Supabase Storage bucket for event-related images.

**Usage:**
- Stores event banner images
- Stores DJ images
- Public access for displaying images in the app

**Path Format:**
- Event banners: `events/{event_id}/banner.{ext}`
- DJ images: `events/{event_id}/dj.{ext}`

---

## Enums Reference

### User Roles
- `'user'` - Regular customer
- `'staff'` - Staff member
- `'club'` - Club owner

### Booking Status
- `'pending'` - Payment pending
- `'confirmed'` - Payment confirmed
- `'cancelled'` - Booking cancelled

### Entry Status
- `'not_entered'` - Not yet entered
- `'entered'` - Entry marked

### Staff Status
- `'pending'` - Waiting for approval
- `'approved'` - Approved by club
- `'rejected'` - Rejected by club

### Transaction Status
- `'pending'` - Payment initiated, awaiting completion
- `'success'` - Payment completed successfully
- `'failed'` - Payment failed or signature invalid

### Gender
- `'male'`
- `'female'`
- `'other'`
- `'prefer_not_to_say'`

---

## Notes

- All tables use UUID for primary keys
- Timestamps are stored in UTC
- Foreign key relationships enforce referential integrity
- JSONB fields allow flexible schema for complex data (e.g., participants array)
- Some fields are denormalized for performance (e.g., `club_name` in `staff` table)
