# Physical Device Setup Guide

## Quick Setup Steps

### 1. Configure Environment Variables

Edit `.env` file in the project root and set:

```bash
# Your Supabase credentials (already configured)
EXPO_PUBLIC_SUPABASE_URL=https://plvagnuyvfnarfwontku.supabase.co
EXPO_PUBLIC_ANON_KEY=your-anon-key-here

# For physical devices, use your computer's local IP address
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:3000
```

**To find your computer's IP address:**
- **Mac/Linux**: Run `ifconfig | grep "inet "` or `ipconfig getifaddr en0`
- **Windows**: Run `ipconfig` and look for IPv4 Address
- Look for your local network IP (e.g., `192.168.1.xxx` or `172.31.73.xxx`)

**Example:**
```bash
EXPO_PUBLIC_API_URL=http://172.31.73.193:3000
```

### 2. Start Expo with LAN Mode

The default start script now uses `--lan` mode automatically:

```bash
npm start
```

Or explicitly:
```bash
npm run start:tunnel  # If LAN doesn't work, use tunnel mode
```

### 3. iOS: HTTP Permissions (Already Configured)

The `app.json` has been updated to allow HTTP connections in iOS. No additional steps needed.

### 4. Android: HTTP Permissions (Already Configured)

The `app.json` has been updated with `usesCleartextTraffic: true`. No additional steps needed.

### 5. Rebuild Dev Client

After making changes, rebuild your development client:

**iOS:**
```bash
npx expo run:ios
```

**Android:**
```bash
npx expo run:android
```

## Troubleshooting

### Network Request Failed
- Ensure your device and computer are on the same Wi-Fi network
- Verify `EXPO_PUBLIC_API_URL` points to your computer's IP (not localhost)
- Make sure your web server is running on port 3000
- Check firewall settings on your computer

### Can't Connect to Expo
- Try `npm run start:tunnel` instead of `--lan`
- Ensure both devices are on the same network
- Check that port 19000 and 8081 are not blocked

### API Server Unreachable
- Verify your web server is running: `cd web && npm run dev`
- Check the IP address in `.env` matches your computer's IP
- Test the API URL in a browser on your device: `http://YOUR_IP:3000/api/health`

## Notes

- **Simulators/Emulators**: Work with `localhost` or `10.0.2.2` (Android emulator)
- **Physical Devices**: MUST use actual IP address from `EXPO_PUBLIC_API_URL`
- After changing `.env`, restart Expo and rebuild dev client
- Supabase (cloud) works on all devices - only the API server needs local network access
