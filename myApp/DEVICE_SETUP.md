# Real Device Setup Guide

## Quick Fix: Try These Steps First

### Step 1: Switch to Expo Go Mode (if compatible)
In your Expo terminal, press `s` to switch to Expo Go mode, then scan the QR code with Expo Go app.

**Note:** This may not work if you're using native modules like Mapbox.

### Step 2: Use Tunnel Mode (if LAN doesn't work)
If your device can't connect via LAN, use tunnel mode:

```bash
npm run start:tunnel
```

This creates a public URL that works from anywhere.

### Step 3: Build Development Build (Required for Native Modules)

Since you're using `@rnmapbox/maps`, you need a development build installed on your device.

#### For iOS:
```bash
# Make sure you have Xcode installed
npx expo run:ios --device
```

This will:
1. Build the app
2. Install it on your connected iPhone
3. Open it automatically

#### For Android:
```bash
# Make sure you have Android Studio and a device connected via USB
npx expo run:android
```

Or use EAS Build for easier setup:
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build for your device
eas build --profile development --platform ios
# or
eas build --profile development --platform android
```

## Troubleshooting Connection Issues

### 1. Check Network Connection
- Ensure your device and computer are on the **same Wi-Fi network**
- Your computer's IP is `172.20.10.7` (from terminal output)
- Try accessing `http://172.20.10.7:8081` in your device's browser

### 2. Check Firewall
On Mac, allow incoming connections:
```bash
# Check if port 8081 is accessible
lsof -i :8081
```

### 3. Update .env File
Make sure your `.env` file has:
```bash
EXPO_PUBLIC_API_URL=http://172.20.10.7:3000
```

### 4. Verify Web Server is Running
Make sure your Next.js server is running:
```bash
cd ../web && npm run dev
```

### 5. Test API Connection
On your device's browser, try:
- `http://172.20.10.7:3000/api/health` (should return OK)
- `http://172.20.10.7:8081` (should show Expo dev tools)

## Common Issues

### "Unable to connect to Metro bundler"
- Try tunnel mode: `npm run start:tunnel`
- Check firewall settings
- Ensure same Wi-Fi network

### "Development build not found"
- You need to build and install the development build first
- Run `npx expo run:ios --device` or `npx expo run:android`

### QR Code doesn't work
- Use tunnel mode instead
- Or manually enter the URL shown in terminal

## Recommended Approach

1. **For quick testing:** Use tunnel mode (`npm run start:tunnel`)
2. **For development:** Build development build (`npx expo run:ios --device`)
3. **For production:** Use EAS Build
