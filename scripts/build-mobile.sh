#!/bin/bash
# Build and sync native iOS/Android apps
# Usage:
#   ./scripts/build-mobile.sh ios        -- open in Xcode
#   ./scripts/build-mobile.sh android    -- open in Android Studio
#   ./scripts/build-mobile.sh            -- sync both

set -e

PLATFORM=${1:-"all"}

echo "🔄 Syncing Capacitor (server URL mode — no static export needed)..."
npx cap sync

if [ "$PLATFORM" = "ios" ] || [ "$PLATFORM" = "all" ]; then
  echo "📱 Opening iOS project in Xcode..."
  echo ""
  echo "  In Xcode:"
  echo "  1. Select your Apple Developer Team under Signing & Capabilities"
  echo "  2. Connect your iPhone or choose a simulator"
  echo "  3. Press ▶ to build and run"
  echo ""
  npx cap open ios
fi

if [ "$PLATFORM" = "android" ] || [ "$PLATFORM" = "all" ]; then
  echo "🤖 Opening Android project in Android Studio..."
  echo ""
  echo "  In Android Studio:"
  echo "  1. Wait for Gradle sync to finish"
  echo "  2. Connect your Android device or choose an emulator"
  echo "  3. Press ▶ to build and run"
  echo ""
  npx cap open android
fi
