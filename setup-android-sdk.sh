#!/bin/bash
# Android SDK Setup Script for Dev Container
# Sets up Android SDK and required tools for building native Android apps

set -e

echo "🤖 Android SDK Setup for CareDroid"
echo "===================================="
echo ""

# Configuration
ANDROID_SDK_ROOT="/opt/android-sdk"
ANDROID_HOME="$ANDROID_SDK_ROOT"
ANDROID_API_LEVEL="35"
BUILD_TOOLS_VERSION="35.0.0"
CMDLINE_TOOLS_VERSION="11076708"

echo "Configuration:"
echo "  SDK Root: $ANDROID_SDK_ROOT"
echo "  API Level: $ANDROID_API_LEVEL"
echo "  Build Tools: $BUILD_TOOLS_VERSION"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  This script should be run with sudo for system-wide installation"
    echo "Run: sudo ./setup-android-sdk.sh"
    exit 1
fi

# Install required dependencies
echo "📦 Installing dependencies..."
apt-get update -qq
apt-get install -y -qq \
    openjdk-17-jdk \
    wget \
    unzip \
    git \
    curl \
    > /dev/null

echo "✅ Dependencies installed"
echo ""

# Create SDK directory
echo "📁 Creating SDK directory..."
mkdir -p "$ANDROID_SDK_ROOT"
cd "$ANDROID_SDK_ROOT"

# Download Android command line tools
echo "⬇️  Downloading Android command line tools..."
CMDLINE_TOOLS_URL="https://dl.google.com/android/repository/commandlinetools-linux-${CMDLINE_TOOLS_VERSION}_latest.zip"
wget -q --show-progress "$CMDLINE_TOOLS_URL" -O cmdline-tools.zip

echo "📦 Extracting command line tools..."
unzip -q cmdline-tools.zip
mkdir -p cmdline-tools/latest
mv cmdline-tools/* cmdline-tools/latest/ 2>/dev/null || true
rm cmdline-tools.zip

echo "✅ Command line tools installed"
echo ""

# Set up environment variables
export ANDROID_HOME="$ANDROID_SDK_ROOT"
export ANDROID_SDK_ROOT="$ANDROID_SDK_ROOT"
export PATH="$PATH:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/emulator"

# Accept licenses
echo "📜 Accepting Android SDK licenses..."
yes | sdkmanager --licenses > /dev/null 2>&1

# Install SDK components
echo ""
echo "📥 Installing Android SDK components..."
echo "  This may take a few minutes..."
echo ""

sdkmanager --install \
    "platform-tools" \
    "platforms;android-${ANDROID_API_LEVEL}" \
    "build-tools;${BUILD_TOOLS_VERSION}" \
    "cmdline-tools;latest" \
    "emulator" \
    "system-images;android-${ANDROID_API_LEVEL};google_apis;x86_64" \
    | grep -v "=" || true

echo ""
echo "✅ SDK components installed"
echo ""

# Set permissions
echo "🔒 Setting permissions..."
chown -R $(logname):$(logname) "$ANDROID_SDK_ROOT" 2>/dev/null || chown -R 1000:1000 "$ANDROID_SDK_ROOT"
chmod -R 755 "$ANDROID_SDK_ROOT"

# Add to system-wide environment
echo "🌍 Configuring environment variables..."
cat > /etc/profile.d/android-sdk.sh <<EOF
export ANDROID_HOME="$ANDROID_SDK_ROOT"
export ANDROID_SDK_ROOT="$ANDROID_SDK_ROOT"
export PATH="\$PATH:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/emulator"
EOF

chmod +x /etc/profile.d/android-sdk.sh

# Add to current user's profile
USER_HOME=$(eval echo ~$(logname))
if [ -f "$USER_HOME/.bashrc" ]; then
    if ! grep -q "ANDROID_HOME" "$USER_HOME/.bashrc"; then
        cat >> "$USER_HOME/.bashrc" <<EOF

# Android SDK
export ANDROID_HOME="$ANDROID_SDK_ROOT"
export ANDROID_SDK_ROOT="$ANDROID_SDK_ROOT"
export PATH="\$PATH:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/emulator"
EOF
    fi
fi

# Create local.properties for Android project
echo "📝 Creating local.properties..."
cat > /workspaces/CareDroid-Ai/android/local.properties <<EOF
# Android SDK location
sdk.dir=$ANDROID_SDK_ROOT

# API configuration
API_BASE_URL=http://10.0.2.2:8000
EOF

chown $(logname):$(logname) /workspaces/CareDroid-Ai/android/local.properties 2>/dev/null || chown 1000:1000 /workspaces/CareDroid-Ai/android/local.properties

echo "✅ Environment configured"
echo ""

# Verify installation
echo "🔍 Verifying installation..."
echo ""

if [ -f "$ANDROID_SDK_ROOT/platform-tools/adb" ]; then
    echo "✅ ADB: $(${ANDROID_SDK_ROOT}/platform-tools/adb --version | head -1)"
fi

if [ -f "$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager" ]; then
    echo "✅ SDK Manager: Installed"
fi

# List installed packages
echo ""
echo "📦 Installed SDK packages:"
$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager --list_installed | grep -E "platform|build-tools|platform-tools" | head -10

echo ""
echo "=========================================="
echo "✅ Android SDK Setup Complete!"
echo "=========================================="
echo ""
echo "SDK Location: $ANDROID_SDK_ROOT"
echo "API Level: $ANDROID_API_LEVEL"
echo "Build Tools: $BUILD_TOOLS_VERSION"
echo ""
echo "⚠️  IMPORTANT: Reload your shell to use the new environment variables:"
echo ""
echo "  source ~/.bashrc"
echo "  # OR"
echo "  exit and start a new terminal"
echo ""
echo "Next steps:"
echo "  1. Reload environment: source ~/.bashrc"
echo "  2. Verify: echo \$ANDROID_HOME"
echo "  3. Build app: cd /workspaces/CareDroid-Ai/android && ./gradlew assembleDebug"
echo ""
