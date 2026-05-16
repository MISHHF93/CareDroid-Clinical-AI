#!/bin/bash
# Deploy to Google Play Store - CareDroid Clinical Companion
# This script helps automate the Play Store deployment process

set -e

cd "$(dirname "$0")"

echo "📱 CareDroid Play Store Deployment"
echo "==================================="
echo ""

# Check prerequisites
echo "Checking prerequisites..."
echo ""

# Check if AAB exists
AAB_FILE="app/build/outputs/bundle/release/app-release.aab"
if [ ! -f "$AAB_FILE" ]; then
    echo "❌ Error: Release AAB not found!"
    echo "Please build the release first:"
    echo "  ./build-release.sh"
    exit 1
fi

# Display AAB info
AAB_SIZE=$(du -h "$AAB_FILE" | cut -f1)
echo "✅ Release AAB found: $AAB_SIZE"
echo ""

# Check if bundletool is available (optional)
if command -v bundletool &> /dev/null; then
    echo "✅ bundletool is available"
    
    # Generate universal APK for testing
    echo "Generating universal APK for testing..."
    bundletool build-apks \
        --bundle="$AAB_FILE" \
        --output=app/build/outputs/bundle/release/app-release.apks \
        --mode=universal
    
    unzip -p app/build/outputs/bundle/release/app-release.apks universal.apk \
        > app/build/outputs/bundle/release/universal.apk
    
    echo "✅ Universal APK generated: app/build/outputs/bundle/release/universal.apk"
else
    echo "ℹ️  bundletool not found (optional for testing)"
fi

echo ""
echo "📋 Deployment Checklist"
echo "======================="
echo ""

# Checklist
checklist=(
    "Release AAB built and signed"
    "App tested on multiple devices"
    "ProGuard/R8 optimizations verified"
    "Crash reporting configured"
    "Privacy policy URL ready"
    "Support email configured"
    "Store listing prepared"
    "Screenshots ready (2-8)"
    "Feature graphic ready (1024x500)"
    "App icon ready (512x512)"
    "What's New text prepared"
    "Content rating completed"
    "Pricing and distribution set"
)

for item in "${checklist[@]}"; do
    echo "  [ ] $item"
done

echo ""
echo "🚀 Manual Steps to Complete:"
echo "============================"
echo ""
echo "1. Go to Google Play Console: https://play.google.com/console"
echo "2. Select or create 'CareDroid Clinical Companion' app"
echo "3. Navigate to 'Release' > 'Production' (or 'Testing' tracks)"
echo "4. Click 'Create new release'"
echo "5. Upload AAB: $AAB_FILE"
echo "6. Add release notes (prepare text in Play Console or your release notes doc)"
echo "7. Review and rollout"
echo ""
echo "Testing Track Workflow:"
echo "  Internal Testing → Closed Testing → Open Testing → Production"
echo ""
echo "Store Listing (in Play Console):"
echo "  1. App Details: see repository README.md (Android / Play Store section)"
echo "  2. Graphics: Upload from play-store-assets/"
echo "  3. Privacy Policy: https://caredroid.ai/privacy"
echo "  4. Content Rating: Complete questionnaire (Medical, 17+)"
echo "  5. Target Audience: Healthcare professionals, patients"
echo ""
echo "📊 Post-Upload Monitoring:"
echo "=========================="
echo "  • Android Vitals (crashes, ANRs)"
echo "  • Pre-launch reports"
echo "  • User reviews and ratings"
echo "  • Install/uninstall metrics"
echo ""
echo "Need help? See README.md at the repository root"
echo ""
