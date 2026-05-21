#!/bin/bash

# CareDroid Android Build Script
# This script builds the Android APK and can be run on:
# - Local machine (recommended)
# - CI/CD pipeline (GitHub Actions, GitLab CI, etc.)
# - Docker container
#
# Usage:
#   ./build-android-apk.sh [debug|release]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BUILD_TYPE="${1:-debug}"
ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
JAVA_HOME="${JAVA_HOME:-$(dirname $(dirname $(readlink -f $(which java))))}"

echo -e "${YELLOW}=== CareDroid Android Build ===${NC}"
echo "Build Type: $BUILD_TYPE"
echo "Android SDK: $ANDROID_HOME"
echo "Java Home: $JAVA_HOME"
echo ""

# Validate prerequisites
validate_environment() {
    echo -e "${YELLOW}Validating environment...${NC}"
    
    # Check Java
    if ! command -v java &> /dev/null; then
        echo -e "${RED}❌ Java is not installed${NC}"
        echo "Please install Java 17 JDK from: https://www.oracle.com/java/technologies/downloads/#java17"
        exit 1
    fi
    
    JAVA_VERSION=$(java -version 2>&1 | grep -oP '(?<=")(\d+)' | head -1)
    if [ "$JAVA_VERSION" -lt 17 ]; then
        echo -e "${RED}❌ Java 17 or higher is required (found: Java $JAVA_VERSION)${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Java 17+ detected${NC}"
    
    # Check Android SDK
    if [ ! -d "$ANDROID_HOME" ]; then
        echo -e "${RED}❌ Android SDK not found at $ANDROID_HOME${NC}"
        echo "Please install Android SDK from: https://developer.android.com/studio"
        exit 1
    fi
    echo -e "${GREEN}✓ Android SDK found${NC}"
    
    # Check if required SDK components are installed
    if [ ! -d "$ANDROID_HOME/platforms/android-35" ]; then
        echo -e "${YELLOW}⚠ Android API 35 not found, installing...${NC}"
        $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager "platforms;android-35" || true
    fi
    
    if [ ! -d "$ANDROID_HOME/build-tools/35.0.0" ]; then
        echo -e "${YELLOW}⚠ Build Tools 35.0.0 not found, installing...${NC}"
        $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager "build-tools;35.0.0" || true
    fi
    
    echo -e "${GREEN}✓ Environment validation passed${NC}"
    echo ""
}

# Build the APK
build_apk() {
    echo -e "${YELLOW}Building APK (type: $BUILD_TYPE)...${NC}"
    echo ""
    
    cd "$(dirname "$0")"
    
    if [ "$BUILD_TYPE" = "release" ]; then
        echo -e "${YELLOW}Building release APK...${NC}"
        ./gradlew clean assembleRelease \
            -Dorg.gradle.jvmargs="-Xmx4g" \
            --info
        
        APK_OUTPUT="app/build/outputs/apk/release/app-release.apk"
    else
        echo -e "${YELLOW}Building debug APK...${NC}"
        ./gradlew clean assembleDebug \
            -Dorg.gradle.jvmargs="-Xmx4g" \
            --info
        
        APK_OUTPUT="app/build/outputs/apk/debug/app-debug.apk"
    fi
}

# Verify build output
verify_apk() {
    echo ""
    if [ -f "$APK_OUTPUT" ]; then
        APK_SIZE=$(du -h "$APK_OUTPUT" | cut -f1)
        echo -e "${GREEN}✓ APK built successfully!${NC}"
        echo -e "  Location: ${YELLOW}$APK_OUTPUT${NC}"
        echo -e "  Size: ${YELLOW}$APK_SIZE${NC}"
        
        # Show installed apps in APK
        echo ""
        echo -e "${YELLOW}APK Contents:${NC}"
        unzip -l "$APK_OUTPUT" | grep classes.dex | head -5
        
        return 0
    else
        echo -e "${RED}❌ APK build failed - output not found${NC}"
        return 1
    fi
}

# Main execution
main() {
    validate_environment
    build_apk
    verify_apk
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}=== Build Complete ===${NC}"
        echo ""
        echo "Next steps:"
        echo "1. Deploy to device/emulator:"
        echo -e "   ${YELLOW}adb install -r $APK_OUTPUT${NC}"
        echo ""
        echo "2. Launch app:"
        echo -e "   ${YELLOW}adb shell am start -n com.caredroid.clinical.debug/.MainActivity${NC}"
        echo ""
        echo "3. View logs:"
        echo -e "   ${YELLOW}adb logcat | grep CareDroid${NC}"
    else
        echo ""
        echo -e "${RED}=== Build Failed ===${NC}"
        exit 1
    fi
}

main
