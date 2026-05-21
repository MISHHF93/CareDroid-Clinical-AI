#!/bin/bash
# Build Release APK and AAB for CareDroid Clinical Companion
# This script builds production-ready Android packages

set -e

cd "$(dirname "$0")"

echo "🚀 CareDroid Release Builder"
echo "============================"
echo ""

# Check if keystore.properties exists
if [ ! -f "app/keystore.properties" ]; then
    echo "❌ Error: app/keystore.properties not found!"
    echo ""
    echo "Please create it from the template:"
    echo "  1. Copy app/keystore.properties.template to app/keystore.properties"
    echo "  2. Fill in your keystore details"
    echo "  3. Run this script again"
    echo ""
    exit 1
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
./gradlew clean

# Build release bundle (AAB - for Play Store)
echo ""
echo "📦 Building release bundle (AAB)..."
./gradlew bundleRelease

# Build release APK (for direct distribution)
echo ""
echo "📱 Building release APK..."
./gradlew assembleRelease

echo ""
echo "✅ Build complete!"
echo ""
echo "Output files:"
echo "  AAB (Play Store): app/build/outputs/bundle/release/app-release.aab"
echo "  APK (Direct):     app/build/outputs/apk/release/app-release.apk"
echo ""

# Display file sizes
if [ -f "app/build/outputs/bundle/release/app-release.aab" ]; then
    AAB_SIZE=$(du -h "app/build/outputs/bundle/release/app-release.aab" | cut -f1)
    echo "AAB Size: $AAB_SIZE"
fi

if [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
    APK_SIZE=$(du -h "app/build/outputs/apk/release/app-release.apk" | cut -f1)
    echo "APK Size: $APK_SIZE"
fi

echo ""
echo "Next steps:"
echo "  1. Test the APK on physical devices"
echo "  2. Upload AAB to Google Play Console"
echo "  3. Complete store listing information"
echo "  4. Submit for review"
echo ""
