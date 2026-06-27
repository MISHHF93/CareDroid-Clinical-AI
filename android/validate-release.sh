#!/bin/bash
# Pre-release Validation Script for CareDroid Clinical Companion
# Run this before deploying to ensure quality standards

set -e

cd "$(dirname "$0")"

echo "🔍 CareDroid Pre-Release Validation"
echo "===================================="
echo ""

ERRORS=0
WARNINGS=0

# Function to print status
print_check() {
    local status=$1
    local message=$2
    
    if [ "$status" = "PASS" ]; then
        echo "✅ $message"
    elif [ "$status" = "FAIL" ]; then
        echo "❌ $message"
        ((ERRORS++))
    elif [ "$status" = "WARN" ]; then
        echo "⚠️  $message"
        ((WARNINGS++))
    else
        echo "ℹ️  $message"
    fi
}

# 1. Check keystore configuration
echo "1. Keystore Configuration"
echo "-------------------------"
if [ -f "app/keystore.properties" ]; then
    print_check "PASS" "Keystore properties file exists"
else
    print_check "FAIL" "Keystore properties file missing"
fi

if [ -f "caredroid-release.keystore" ]; then
    print_check "PASS" "Release keystore exists"
else
    print_check "WARN" "Release keystore not found (may be elsewhere)"
fi
echo ""

# 2. Check build.gradle configuration
echo "2. Build Configuration"
echo "----------------------"
if grep -q "signingConfigs" app/build.gradle.kts; then
    print_check "PASS" "Release signing configured"
else
    print_check "FAIL" "Release signing not configured"
fi

if grep -q "isMinifyEnabled = true" app/build.gradle.kts; then
    print_check "PASS" "ProGuard/R8 enabled"
else
    print_check "FAIL" "Code minification not enabled"
fi
echo ""

# 3. Check ProGuard rules
echo "3. ProGuard Configuration"
echo "-------------------------"
if [ -f "app/proguard-rules.pro" ]; then
    lines=$(wc -l < app/proguard-rules.pro)
    if [ "$lines" -gt 50 ]; then
        print_check "PASS" "ProGuard rules comprehensive ($lines lines)"
    else
        print_check "WARN" "ProGuard rules may be incomplete ($lines lines)"
    fi
else
    print_check "FAIL" "ProGuard rules file missing"
fi
echo ""

# 4. Check version information
echo "4. Version Information"
echo "----------------------"
VERSION_CODE=$(grep "versionCode" app/build.gradle.kts | head -1 | grep -o '[0-9]\+')
VERSION_NAME=$(grep "versionName" app/build.gradle.kts | head -1 | grep -o '"[^"]*"' | tr -d '"')
print_check "INFO" "Version Code: $VERSION_CODE"
print_check "INFO" "Version Name: $VERSION_NAME"
echo ""

# 5. Check test files
echo "5. Test Coverage"
echo "----------------"
TEST_FILES=$(find app/src/test -name "*Test.kt" 2>/dev/null | wc -l)
ANDROID_TEST_FILES=$(find app/src/androidTest -name "*Test.kt" 2>/dev/null | wc -l)

if [ "$TEST_FILES" -gt 5 ]; then
    print_check "PASS" "Unit tests present ($TEST_FILES files)"
else
    print_check "WARN" "Limited unit tests ($TEST_FILES files)"
fi

if [ "$ANDROID_TEST_FILES" -gt 3 ]; then
    print_check "PASS" "Integration tests present ($ANDROID_TEST_FILES files)"
else
    print_check "WARN" "Limited integration tests ($ANDROID_TEST_FILES files)"
fi
echo ""

# 6. Check Play Store assets
echo "6. Play Store Assets"
echo "--------------------"
if [ -d "play-store-assets/icon" ]; then
    ICON_COUNT=$(find play-store-assets/icon -name "*.png" 2>/dev/null | wc -l)
    if [ "$ICON_COUNT" -gt 0 ]; then
        print_check "PASS" "App icon(s) present"
    else
        print_check "WARN" "App icon not found in play-store-assets/icon/"
    fi
else
    print_check "WARN" "Icon directory not found"
fi

if [ -d "play-store-assets/screenshots/phone" ]; then
    SCREENSHOT_COUNT=$(find play-store-assets/screenshots/phone -name "*.png" -o -name "*.jpg" 2>/dev/null | wc -l)
    if [ "$SCREENSHOT_COUNT" -ge 2 ]; then
        print_check "PASS" "Screenshots present ($SCREENSHOT_COUNT files)"
    else
        print_check "FAIL" "Insufficient screenshots ($SCREENSHOT_COUNT, need at least 2)"
    fi
else
    print_check "FAIL" "Screenshot directory not found"
fi

if [ -f "../README.md" ]; then
    print_check "PASS" "Repository README present (store listing: maintain in Play Console or append to README)"
else
    print_check "WARN" "Repository README.md not found at repo root"
fi
echo ""

# 7. Check security configurations
echo "7. Security Configuration"
echo "-------------------------"
if grep -q "HIPAA" app/src/main -r 2>/dev/null; then
    print_check "INFO" "HIPAA compliance mentioned in code"
fi

if [ -f "app/src/main/res/xml/network_security_config.xml" ]; then
    print_check "PASS" "Network security config present"
else
    print_check "WARN" "Network security config not found"
fi
echo ""

# 8. Run tests
echo "8. Running Tests"
echo "----------------"
echo "Running unit tests..."
if ./gradlew test --quiet 2>&1 | grep -q "BUILD SUCCESSFUL"; then
    print_check "PASS" "Unit tests passed"
else
    print_check "FAIL" "Unit tests failed"
fi
echo ""

# Summary
echo "=========================================="
echo "VALIDATION SUMMARY"
echo "=========================================="
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"
echo ""

if [ "$ERRORS" -gt 0 ]; then
    echo "❌ Pre-release validation FAILED"
    echo "Please fix all errors before releasing."
    exit 1
elif [ "$WARNINGS" -gt 0 ]; then
    echo "⚠️  Pre-release validation passed with warnings"
    echo "Consider addressing warnings for best practices."
    exit 0
else
    echo "✅ Pre-release validation PASSED"
    echo "Ready for release!"
    exit 0
fi
