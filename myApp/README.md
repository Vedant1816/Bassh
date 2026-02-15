# Bassh Mobile App (myApp)

This is the mobile application for Bassh, built with Expo, React Native, and Supabase.

## Backend Integration & API Flows

The application communicates with a backend API (hosted on Vercel) and Supabase for authentication and data persistence.

### Core Services (`_services/`)

*   **`api-config.ts`**: Defines the `API_BASE_URL` from `EXPO_PUBLIC_API_URL` (defaults to production). Contains `fetchWithFallback` which handles network requests, timeouts (15s), and error logging.
*   **`supabase-public.ts`**: Initializes the Supabase client using `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_ANON_KEY`. Uses `AsyncStorage` for session persistence.
*   **`auth-fetch.ts`**:
    *   `withAuthHeaders`:Retrieves the current Supabase session and attaches the `Authorization: Bearer <token>` header to requests.
    *   `authFetch`: A wrapper around `fetchWithFallback` that automatically includes authentication headers.
*   **`user-role.ts`**:
    *   `getUserRole`: Fetches the user's role (`user` or `staff`) from the `public.users` table in Supabase.
    *   `redirectToRoleHome`: Redirects the user to `/(tabs)` (Client) or `/staff` (Staff) based on their role.

---

### File-by-File Backend Flow

#### **Authentication & Onboarding**

*   **`app/(auth)/login.tsx` & `staff-login.tsx`**:
    *   Uses `supabase.auth.signInWithPassword` or OAuth flows.
    *   On success, calls `redirectToRoleHome` to route the user.
*   **`app/auth/callback.tsx`**:
    *   Handles OAuth redirects.
    *   Sets the Supabase session using `access_token` and `refresh_token` from URL parameters.
    *   **Flow**:
        1.  Checks if user exists in backend via `GET /api/users`.
        2.  If 404, creates user via `POST /api/users` with email and role.
        3.  Redirects to `/onboarding/about-you` if new, otherwise to role home.
*   **`app/onboarding/about-you.tsx`**:
    *   Updates user profile via `PATCH /api/users/me`.
    *   Saves `first_name`, `last_name`, `username`, `gender`.
*   **Phone Verification (Twilio)**:
    *   **`app/onboarding/phone.tsx`**:
        *   Captures user's phone number + country code.
        *   **Send OTP**: Calls `POST /api/auth/send-otp`.
            *   **Backend**: Generates a 6-digit random OTP.
            *   **Hash**: Creates a SHA-256 hash of the OTP.
            *   **Storage**: Stores `{ phone, otp_hash, expires_at }` in Supabase `phone_otps` table (5 min expiry).
            *   **Twilio**: Sends the raw OTP via SMS using Twilio API (`Messages.json`).
    *   **`app/onboarding/otp.tsx`**:
        *   Captures 6-digit OTP input with auto-focus helper.
        *   **Verify**: Calls `POST /api/auth/verify-otp`.
            *   **Backend**: Hashes the input OTP and checks `phone_otps` table for a match.
            *   **Validation**: Checks if record exists and is not expired.
            *   **Cleanup**: Deletes the used OTP record upon success.
        *   **Save**: Calls `POST /api/auth/save-phone`.
            *   **Backend**: Updates `phone_number` in the `customers` table for the authenticated user.

#### **Main User Tabs (`app/(tabs)/`)**

*   **`index.tsx` (Home)**:
    *   **Core Layout**: Renders a full-screen Mapbox map with floating UI elements (Header, Search, Floating Actions, Bottom Cards).
    *   **`LocationHeader.tsx`**:
        *   Displays current city/address.
        *   Tapping opens a **City Picker Modal** with a grid of popular cities and a search list.
        *   Updates the map camera `centerCoordinate` upon selection.
    *   **`SearchBar.tsx`**:
        *   Debounced input (300ms) calling `GET /api/search?q=...`.
        *   **Search Flow**:
            1.  **Redis Cache**: Checks `search:club:{q}` and `search:event:{q}` sets for IDs (with 2s timeout).
            2.  **DB Lookup (Cache Hit)**: If IDs found in Redis, fetching details for those specific IDs from Supabase.
            3.  **DB Search (Cache Miss/Fallback)**: If Redis empty or fails, performs `ilike %q%` search directly on `clubs` and `events` tables.
        *   Returns a mixed list of **Clubs** and **Events**.
        *   Tapping a result navigates to `/club/[id]` or `/event/[id]`.
    *   **Map & Heatmap**:
        *   **Heatmap**: Fetches GeoJSON data from `POST /api/map/heatmap` every 5 minutes.
        *   Renders a `HeatmapLayer` with a color gradient (Green -> Yellow -> Red) for crowd density.
        *   **Club Markers**: Fetches nearby clubs via `GET /api/clubs/nearby`. Custom markers show club logo (or placeholder) and rating.
    *   **`ClubCard.tsx`**:
        *   Displays club details in a horizontal scroll view at the bottom.
        *   **Smart Pricing**: Automatically shows today's price (Stag/Couple) based on the current day of the week, parsing JSONB `prices`.
        *   **Interaction**: Tapping navigates to club profile; "Navigate" button opens external maps (Google/Apple Maps).
    *   **Floating Actions**: Quick buttons for "Recenter", "Filter" (opens `FilterClubsModal`), etc.
*   **`events.tsx`**:
    *   Lists all events. Fetches from `GET /api/events`. Supports filtering (search terms handled on frontend or via query params).
*   **`wallet.tsx`**:
    *   Fetches wallet balance and transaction history via `GET /api/wallet` (or similar endpoint).
*   **`profile.tsx`**:
    *   Fetches user profile details `GET /api/users/me`.

#### **Events & Booking**

*   **`app/event/[id].tsx`**:
    *   **Get Details**: `GET /api/events/:id` (returns event, club, pricing, guest list preview).
    *   **Get Discounts**: `GET /api/discounts/event?event_id=:id`.
    *   **Guest List Status**: `GET /api/events/:id/guest-list/status`.
    *   **Apply Guest List**: `POST /api/events/:id/guest-list/apply` (Body: phone, username, age, gender).
*   **`app/event/[id]/book.tsx` (Booking Flow)**:
    *   **Data Fetching**:
        *   Fetches event details (`GET /api/events/:id`) and discounts (`GET /api/discounts/event`).
        *   Fetches User Wallet Balance from Supabase `customers` table.
    *   **Logic**:
        *   Manages ticket selection (Stag/Couple) and participant data collection.
        *   Calculates final price applying logic for couples/stags and discounts.
    *   **Payment & Checkout**:
        *   **Wallet**: `POST /api/payments/event/pay-with-wallet` (if sufficient balance).
        *   **Razorpay**:
            1.  Creates Booking: `POST /api/bookings/create` (Returns `booking_id`).
            2.  Creates Order: `POST /api/payments/checkout/create-order`.
            3.  Verifies Payment: `POST /api/payments/verify`.
    *   **Notifications**: Sends confirmation via `/api/notifications/send` and `/api/notifications/send-bulk` upon success.
*   **`app/booking/[id].tsx`**:
    *   **Get Booking**: `GET /api/bookings/:id`.
    *   **Check Review**: `GET /api/reviews?booking_id=:id`.
    *   **Cancel**: `POST /api/bookings/:id/cancel`.
    *   **Features**: Generates QR code locally from base64 data, handles sharing/downloading.
*   **`app/bookings.tsx`**:
    *   **Data Fetching**: `GET /api/bookings/my-bookings`.
    *   **Logic**:
        *   **Booking Type**: Determines "Couple", "Stag", or "Mixed" entry based on participant gender counts.
        *   **Dynamic UI**: Renders cards with status badges (Confirmed, Entered, Cancelled, Pending) and details.
        *   **Navigation**: Tapping a card opens `app/booking/[id].tsx`.

#### **Club Integration**

*   **`app/club/[clubId].tsx`**:
    *   **Get Club**: `GET /api/clubs/:id`.
    *   **Get Discounts**: `GET /api/discounts/club?club_id=:id`.
    *   **Get Reviews**: `GET /api/reviews?club_id=:id`.
*   **`app/club/components/CouponsModal.tsx`**:
    *   **UI**: Displays a list of available coupons/discounts for a club.
    *   **Props**: Receives `discounts[]` array, `clubName`, and visibility controls.
    *   **Logic**:
        *   Formats discount descriptions (Percentage vs Flat off).
        *   Shows minimum purchase requirements.
        *   Renders coupon codes if available.

#### **Staff Portal (`app/staff/`)**

*   **`index.tsx` (Dashboard)**:
    *   **Check Status**: `GET /api/staff/status` (Returns `pending`, `approved`, `rejected` and club info).
    *   If `club_id` is null, prompts to join club.
*   **`join-club.tsx`**:
    *   **Join**: `POST /api/staff/join-club` (Body: `club_token`, `post`).
    *   Requires a valid 8-character token provided by the club owner.
*   **`scan-qr.tsx`**:
    *   **Validate QR**: `POST /api/staff/scan-qr` (Body: `qr_data`).
        *   Validates booking existence, date, venue match, and payment status.
    *   **Mark Entry**: `POST /api/staff/mark-entry` (Body: `booking_id`).
        *   Updates booking status to `entered` and records timestamp.

#### **Payment & Transactions**

*   **`app/transaction/[id].tsx`**:
    *   **Get Details**: `GET /api/transactions/:id`.
    *   Displays amount, status, type (wallet top-up, booking, etc.), and linked entity details.
*   **`app/payment/success.tsx`**:
    *   Displayed after successful payment.
    *   Verifies booking/transaction details via `GET /api/bookings/:id`.
    *   Displays "Money Saved" if applicable.

#### **Miscellaneous**

*   **`app/category/[id].tsx`**: Fetches all events `GET /api/events` and filters client-side by category search term.
*   **`app/review.tsx`**: Submits a review via `POST /api/reviews`.
*   **`app/my-reviews.tsx`**: Fetches user's reviews `GET /api/reviews/me` (or filtered `/api/reviews`).
*   **`app/feedback.tsx`**: Submits app feedback (likely `POST /api/feedback` or similar).
*   **`app/components/Notifications.tsx`**:
    *   **Fetch Notifications**: `GET /api/notifications/send-all` (Returns list of notifications + unread count).
    *   **Mark Read**: `PATCH /api/notifications/send-all` (Body: `{ markAllRead: true }`).
    *   **Interactions**:
        *   Displays list of notifications (Booking, Promo, Event).
        *   For `booking` type, opens `BookingQRModal` to show the entry pass/QR code.

### Key Database Functions

#### **Calculate Heatmap Data**

The backend uses a PostgreSQL function to aggregate live attendance data for the heatmap. This function calculates the intensity based on confirmed bookings vs. club capacity.

```sql
CREATE OR REPLACE FUNCTION public.get_live_club_heatmap()
 RETURNS jsonb
 LANGUAGE sql
AS $function$
WITH attendance AS (
  SELECT
    l.id AS location_id,
    l.name,
    l.location,
    l.club_id,
    c.max_capacity,
    COALESCE(
      SUM(jsonb_array_length(b.participants)),
      0
    ) AS attending_today
  FROM locations l
  JOIN clubs c
    ON c.id = l.club_id
  LEFT JOIN bookings b
    ON b.club_id = l.club_id
    AND b.booking_date = CURRENT_DATE
    AND b.booking_status = 'confirmed'
  GROUP BY
    l.id,
    l.name,
    l.location,
    l.club_id,
    c.max_capacity
)

SELECT COALESCE(
  jsonb_agg(
    jsonb_build_object(
      'type', 'Feature',
      'geometry', ST_AsGeoJSON(location)::jsonb,
      'properties', jsonb_build_object(
        'id', location_id,
        'club_id', club_id,
        'name', name,
        'attending_today', attending_today,
        'max_capacity', max_capacity,
        'intensity',
          CASE
            WHEN max_capacity IS NULL THEN 0
            WHEN max_capacity = 0 THEN 0
            ELSE LEAST(attending_today::float / max_capacity, 1.0)
          END
      )
    )
  ),
  '[]'::jsonb
)
FROM attendance;
$function$
```

#### **Calculate Nearby Clubs**

The backend uses a PostgreSQL function to calculate the distance between the user's location and clubs, returning sorted clubs within 30km.

```sql
CREATE OR REPLACE FUNCTION public.get_nearby_clubs(user_lat double precision, user_lng double precision)
 RETURNS TABLE(id uuid, name text, address_text text, latitude double precision, longitude double precision, rating numeric, guest_count integer, distance_km double precision)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT *
  FROM (
    SELECT
      c.id,
      c.club_name AS name,
      c.address_text,
      c.latitude,
      c.longitude,
      c.rating,
      c.guest_count,

      (
        6371 * acos(
          cos(radians(user_lat)) *
          cos(radians(c.latitude)) *
          cos(radians(c.longitude) - radians(user_lng)) +
          sin(radians(user_lat)) *
          sin(radians(c.latitude))
        )
      ) AS distance_km

    FROM public.clubs c
    WHERE c.latitude IS NOT NULL
      AND c.longitude IS NOT NULL
  ) sub
  WHERE distance_km <= 30
  ORDER BY distance_km ASC;
$function$
```

## Environment Variables

To run this project, you need to set up the following environment variables in a `.env` file at the root of the `myApp` directory.

### Supabase Configuration
- `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase project URL.
- `EXPO_PUBLIC_ANON_KEY`: Your Supabase anonymous key.

### API Configuration
- `EXPO_PUBLIC_API_URL`: (Optional) Base URL for the backend API. Defaults to `https://bassh-green.vercel.app` if not set.
