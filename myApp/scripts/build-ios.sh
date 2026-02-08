#!/bin/bash

# iOS Build Script with Provisioning Updates
# This script builds the iOS app with -allowProvisioningUpdates flag so Xcode
# can create/update the provisioning profile when building for a device.
#
# Usage:
#   ./scripts/build-ios.sh                    # simulator (default)
#   ./scripts/build-ios.sh iphonesimulator    # simulator
#   ./scripts/build-ios.sh iphoneos           # device (creates profile if needed)

set -e

cd "$(dirname "$0")/.."

echo "🔨 Building iOS app with provisioning updates enabled..."

cd ios

# Check if workspace exists
if [ ! -f "myApp.xcworkspace/contents.xcworkspacedata" ]; then
    echo "❌ Error: myApp.xcworkspace not found"
    echo "Run 'npx expo prebuild --platform ios' first"
    exit 1
fi

# Build for simulator by default
SDK=${1:-iphonesimulator}
CONFIGURATION=${2:-Debug}

echo "📱 Building for: $SDK"
echo "⚙️  Configuration: $CONFIGURATION"

if [ "$SDK" = "iphoneos" ]; then
    # Device build: allow Xcode to create/update provisioning profile
    xcodebuild \
        -workspace myApp.xcworkspace \
        -scheme myApp \
        -configuration "$CONFIGURATION" \
        -sdk iphoneos \
        -destination "generic/platform=iOS" \
        -allowProvisioningUpdates \
        -derivedDataPath ./build
else
    xcodebuild \
        -workspace myApp.xcworkspace \
        -scheme myApp \
        -configuration "$CONFIGURATION" \
        -sdk "$SDK" \
        -allowProvisioningUpdates \
        -derivedDataPath ./build
fi

echo "✅ Build completed!"
