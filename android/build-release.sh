#!/bin/bash
# Build release APK and AAB for the Capacitor Android shell.

set -euo pipefail

cd "$(dirname "$0")/.."

echo "CareDroid Android release builder"
echo "================================="
echo ""

if [ ! -f "android/app/keystore.properties" ]; then
    echo "Error: android/app/keystore.properties not found."
    echo ""
    echo "Create it from the template, fill in the keystore values, then run this script again."
    exit 1
fi

echo "Building TypeScript web app..."
npm run build

echo "Syncing Capacitor Android shell..."
npx --yes @capacitor/cli@5 sync android

cd android

echo "Cleaning previous Android builds..."
./gradlew clean

echo "Building release bundle (AAB)..."
./gradlew bundleRelease

echo "Building release APK..."
./gradlew assembleRelease

echo ""
echo "Build complete."
echo "AAB: app/build/outputs/bundle/release/app-release.aab"
echo "APK: app/build/outputs/apk/release/app-release.apk"

if [ -f "app/build/outputs/bundle/release/app-release.aab" ]; then
    du -h "app/build/outputs/bundle/release/app-release.aab"
fi

if [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
    du -h "app/build/outputs/apk/release/app-release.apk"
fi
