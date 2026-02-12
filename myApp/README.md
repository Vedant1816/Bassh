# Bassh Mobile App (myApp)

This is the mobile application for Bassh, built with Expo.

## Environment Variables

To run this project, you need to set up the following environment variables in a `.env` file at the root of the `myApp` directory.

### Supabase Configuration
- `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase project URL (e.g., `https://your-project.supabase.co`).
- `EXPO_PUBLIC_ANON_KEY`: Your Supabase anonymous key for client-side authentication.
- `SERVICE_ROLE_KEY`: Your Supabase service role key (Warning: This should only be used in secure environments).

### API Configuration
- `EXPO_PUBLIC_API_URL`: The base URL for the backend API services.

### Mapbox Configuration
- `EXPO_PUBLIC_MAPBOX_TOKEN`: Your public Mapbox access token.
- `EXPO_PUBLIC_MAPBOX_SECRET_TOKEN`: Your secret Mapbox token (usually starting with `sk.`).

### Payment Configuration (Razorpay)
- `EXPO_PUBLIC_RAZORPAY_KEY_ID`: Your Razorpay Key ID for processing payments.

## Getting Started

1. Copy `.env.example` to `.env`.
2. Fill in the required values.
3. Run `npm install`.
4. Run `npm run start` or `npx expo start`.
