# Razorpay iOS Setup Guide

## Step 1: Generate iOS Native Folders

Run this command to generate the iOS project:

```bash
cd myApp
expo prebuild --platform ios
```

## Step 2: Install CocoaPods Dependencies

After `expo prebuild`, navigate to the iOS folder and install pods:

```bash
cd ios
pod install
cd ..
```

**Note:** If you don't have CocoaPods installed:
```bash
sudo gem install cocoapods
```

## Step 3: Verify Info.plist Configuration

The `app.json` already has the required `NSAppTransportSecurity` configuration. After `expo prebuild`, verify that `ios/myApp/Info.plist` contains:

```xml
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key>
  <true/>
</dict>
```

This is already configured in your `app.json`, so it should be automatically added.

## Step 4: Build and Run iOS App

Build the development build for iOS:

```bash
expo run:ios
```

Or if you want to build for a physical device:

```bash
expo run:ios --device
```

## Step 5: Test Razorpay Payment

1. Navigate to an event booking
2. Complete the booking form
3. Click "Checkout"
4. The Razorpay payment UI should open directly in the app (not in a browser)

## Troubleshooting

### Error: "Unable to resolve module react-native-razorpay"
- Make sure you've run `expo prebuild` first
- Rebuild the app: `expo run:ios`

### Error: "CocoaPods not found"
- Install CocoaPods: `sudo gem install cocoapods`
- Then run `cd ios && pod install`

### Payment UI doesn't open
- Check that `EXPO_PUBLIC_RAZORPAY_KEY_ID` is set in `.env`
- Verify the Razorpay key is correct (test key: `rzp_test_...`)
- Check console logs for any errors

### Build fails
- Clean build: `cd ios && xcodebuild clean`
- Delete `ios/Pods` and `ios/Podfile.lock`
- Run `pod install` again
- Try `expo run:ios` again

## Current Configuration

✅ **Info.plist**: `NSAppTransportSecurity` configured  
✅ **Razorpay Key**: Set in `app.json` extra config  
✅ **Package**: `react-native-razorpay` installed  
✅ **Payment Flow**: Configured in `app/payment/redirect.tsx`
