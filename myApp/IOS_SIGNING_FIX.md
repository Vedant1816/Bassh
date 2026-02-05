# iOS Provisioning Profile Fix

## Problem
Xcode can't find or generate a provisioning profile for `com.harshsehra.myApp`. The error indicates:
```
No profiles for 'com.harshsehra.myApp' were found: Xcode couldn't find any iOS App Development provisioning profiles matching 'com.harshsehra.myApp'. Automatic signing is disabled and unable to generate a profile.
```

## Solutions

### Solution 1: Open Xcode and Configure Signing (Recommended)

1. Open the Xcode project:
   ```bash
   cd /Users/harsh/Desktop/Bassh/myApp
   open ios/myApp.xcodeproj
   ```

2. In Xcode:
   - Select the `myApp` project in the navigator
   - Select the `myApp` target
   - Go to the **Signing & Capabilities** tab
   - Check **"Automatically manage signing"**
   - Select your **Team** from the dropdown (or sign in with your Apple ID)
   - Xcode will automatically generate the provisioning profile

3. Close Xcode and try building again:
   ```bash
   npm run ios
   ```

### Solution 2: Use Command Line with Provisioning Updates Flag

Build with the `-allowProvisioningUpdates` flag:

```bash
cd /Users/harsh/Desktop/Bassh/myApp/ios
xcodebuild -workspace myApp.xcworkspace \
  -scheme myApp \
  -configuration Debug \
  -sdk iphonesimulator \
  -allowProvisioningUpdates
```

Or if building for a device:
```bash
xcodebuild -workspace myApp.xcworkspace \
  -scheme myApp \
  -configuration Debug \
  -sdk iphoneos \
  -allowProvisioningUpdates
```

### Solution 3: Sign In to Xcode Command Line Tools

Make sure you're signed in to Xcode with your Apple ID:

```bash
# Check if you're signed in
xcrun altool --list-providers

# Or sign in via Xcode GUI:
# Xcode > Settings > Accounts > Add Apple ID
```

### Solution 4: Use Expo Development Build (Easier for Development)

Instead of building directly, use Expo's development build:

```bash
# Install EAS CLI if not already installed
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build for iOS simulator
eas build --platform ios --profile development --local
```

### Solution 5: Update app.json with Development Team

If you want to specify the team in Expo config, add it to `app.json`:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.harshsehra.myApp",
      "config": {
        "usesNonExemptEncryption": false
      }
    }
  }
}
```

Then regenerate the iOS project:
```bash
cd /Users/harsh/Desktop/Bassh/myApp
npx expo prebuild --platform ios --clean
```

## Quick Fix Script

Run this script to build with provisioning updates enabled:

```bash
#!/bin/bash
cd /Users/harsh/Desktop/Bassh/myApp/ios
xcodebuild -workspace myApp.xcworkspace \
  -scheme myApp \
  -configuration Debug \
  -sdk iphonesimulator \
  -allowProvisioningUpdates \
  -derivedDataPath ./build
```

## Troubleshooting

### If team ID doesn't match:
The project currently has team ID `G7HB7HM7RF`. If this doesn't match your Apple Developer account:
1. Open Xcode project
2. Change the team in Signing & Capabilities
3. Or update it in `ios/myApp.xcodeproj/project.pbxproj`

### If you don't have an Apple Developer account:
- For simulator: You can use a free Apple ID
- For device: You need a paid Apple Developer account ($99/year)

### Clean build:
```bash
cd /Users/harsh/Desktop/Bassh/myApp/ios
rm -rf build DerivedData
xcodebuild clean -workspace myApp.xcworkspace -scheme myApp
```
