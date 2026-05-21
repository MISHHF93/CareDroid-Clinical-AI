#!/bin/bash
# Generate Release Keystore for CareDroid Clinical Companion
# This script creates a keystore for signing release builds

set -e

KEYSTORE_FILE="caredroid-release.keystore"
KEY_ALIAS="caredroid-release"
VALIDITY_DAYS=10000
KEY_SIZE=2048

echo "🔐 CareDroid Release Keystore Generator"
echo "========================================"
echo ""
echo "This will generate a keystore for signing your Android release builds."
echo "You will be prompted for passwords and certificate information."
echo ""
echo "IMPORTANT: Store the passwords securely! You'll need them for every release."
echo ""

# Check if keystore already exists
if [ -f "$KEYSTORE_FILE" ]; then
    echo "⚠️  Warning: $KEYSTORE_FILE already exists!"
    read -p "Do you want to overwrite it? (yes/no): " overwrite
    if [ "$overwrite" != "yes" ]; then
        echo "Aborted."
        exit 0
    fi
    rm "$KEYSTORE_FILE"
fi

# Generate keystore
echo ""
echo "Generating keystore..."
keytool -genkeypair \
    -alias "$KEY_ALIAS" \
    -keyalg RSA \
    -keysize $KEY_SIZE \
    -validity $VALIDITY_DAYS \
    -keystore "$KEYSTORE_FILE" \
    -storetype JKS

echo ""
echo "✅ Keystore generated successfully: $KEYSTORE_FILE"
echo ""
echo "Next steps:"
echo "1. Copy keystore.properties.template to keystore.properties"
echo "2. Fill in your passwords in keystore.properties"
echo "3. NEVER commit keystore.properties or $KEYSTORE_FILE to git!"
echo "4. Store both files securely (password manager, encrypted backup)"
echo ""
echo "To verify your keystore:"
echo "  keytool -list -v -keystore $KEYSTORE_FILE -alias $KEY_ALIAS"
echo ""
