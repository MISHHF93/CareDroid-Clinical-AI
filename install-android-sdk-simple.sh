#!/bin/bash
# Simplified Android SDK Setup

set -e

echo "🤖 Installing Android SDK..."
echo ""

ANDROID_SDK_ROOT="/opt/android-sdk"
ANDROID_API_LEVEL="35"
BUILD_TOOLS_VERSION="35.0.0"
CMDLINE_TOOLS_VERSION="11076708"

echo "Creating SDK directory..."
sudo mkdir -p "$ANDROID_SDK_ROOT"
cd "$ANDROID_SDK_ROOT"

echo "Downloading command line tools..."
sudo wget -q --show-progress "https://dl.google.com/android/repository/commandlinetools-linux-${CMDLINE_TOOLS_VERSION}_latest.zip" -O cmdline-tools.zip

echo "Extracting..."
sudo unzip -q cmdline-tools.zip
sudo mkdir -p cmdline-tools/latest
sudo mv cmdline-tools/* cmdline-tools/latest/ 2>/dev/null || true
sudo rm cmdline-tools.zip

export ANDROID_HOME="$ANDROID_SDK_ROOT"
export PATH="$PATH:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin"

echo "Accepting licenses..."
yes | sudo $ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager --licenses > /dev/null 2>&1

echo "Installing SDK components..."
sudo $ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager --install \
    "platform-tools" \
    "platforms;android-${ANDROID_API_LEVEL}" \
    "build-tools;${BUILD_TOOLS_VERSION}" \
    "cmdline-tools;latest" 

sudo chown -R $(whoami):$(whoami) "$ANDROID_SDK_ROOT" 2>/dev/null || sudo chown -R codespace:codespace "$ANDROID_SDK_ROOT"

echo "Creating local.properties..."
cat > /workspaces/CareDroid-Ai/android/local.properties <<EOF
sdk.dir=$ANDROID_SDK_ROOT
API_BASE_URL=http://10.0.2.2:8000
EOF

echo ""
echo "Adding to environment..."
echo "export ANDROID_HOME=$ANDROID_SDK_ROOT" >> ~/.bashrc
echo "export ANDROID_SDK_ROOT=$ANDROID_SDK_ROOT" >> ~/.bashrc
echo 'export PATH=$PATH:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools' >> ~/.bashrc

export ANDROID_HOME="$ANDROID_SDK_ROOT"
export ANDROID_SDK_ROOT="$ANDROID_SDK_ROOT"
export PATH="$PATH:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools"

echo ""
echo "✅ Android SDK installed!"
echo ""
echo "SDK Location: $ANDROID_SDK_ROOT"
echo ""
echo "Run: source ~/.bashrc"
echo "Then: cd /workspaces/CareDroid-Ai/android && ./gradlew assembleDebug"
