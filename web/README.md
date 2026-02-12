# Bassh Web & API (web)

This is the web application and API backend for Bassh, built with Next.js.

## Environment Variables

To run this project, you need to set up the following environment variables in a `.env` file at the root of the `web` directory.

### Supabase Configuration
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL.
- `NEXT_PUBLIC_ANON_KEY`: Your Supabase anonymous key.
- `SERVICE_ROLE_KEY`: Your Supabase service role key for admin operations.

### Twilio Configuration (OTP/SMS)
- `TWILIO_ACCOUNT_SID`: Your Twilio Account SID.
- `TWILIO_AUTH_TOKEN`: Your Twilio Auth Token.
- `TWILIO_PHONE_NUMBER`: Your Twilio phone number for sending messages.

### Razorpay Configuration (Payments)
- `RAZORPAY_KEY_ID`: Your Razorpay Key ID.
- `RAZORPAY_KEY_SECRET`: Your Razorpay Key Secret.

### Redis Configuration (Upstash)
- `REDIS_REST_URL`: Your Upstash Redis REST URL.
- `REDIS_REST_TOKEN`: Your Upstash Redis REST token.

### Application Configuration
- `NEXT_PUBLIC_APP_URL`: The URL used for app redirection (e.g., `bassh://payment/redirect`).

## Getting Started

1. Copy `.env.example` to `.env`.
2. Fill in the required values.
3. Run `npm install`.
4. Run `npm run dev`.
