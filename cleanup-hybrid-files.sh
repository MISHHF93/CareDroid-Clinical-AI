#!/bin/bash
# Cleanup Hybrid/Web App Files - CareDroid Android Migration
# This script removes old Capacitor and web-specific files after native Android migration

set -e

echo "🧹 CareDroid - Hybrid Files Cleanup"
echo "===================================="
echo ""
echo "This script will remove old hybrid app files that are no longer needed"
echo "after the native Android migration."
echo ""
echo "⚠️  WARNING: This will delete files! Make sure you have a backup."
echo ""
read -p "Do you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "Starting cleanup..."
echo ""

# Track what we're removing
REMOVED_COUNT=0

# Function to remove file/directory if it exists
remove_if_exists() {
    local path=$1
    local description=$2
    
    if [ -e "$path" ]; then
        echo "🗑️  Removing: $description"
        rm -rf "$path"
        ((REMOVED_COUNT++))
    fi
}

# 1. Remove Capacitor configuration
echo "1. Cleaning Capacitor configuration..."
remove_if_exists "capacitor.config.json" "Capacitor config"
remove_if_exists "capacitor.config.ts" "Capacitor TypeScript config"

# 2. Remove iOS directory (if you're only doing Android)
echo ""
echo "2. Cleaning iOS directory..."
read -p "Remove iOS directory? (yes/no): " remove_ios
if [ "$remove_ios" = "yes" ]; then
    remove_if_exists "ios" "iOS platform directory"
fi

# 3. Remove web build output
echo ""
echo "3. Cleaning web build outputs..."
remove_if_exists "dist" "Vite build output"
remove_if_exists "build" "Alternative build output"

# 4. Remove Vite configuration (if not needed)
echo ""
echo "4. Cleaning Vite configuration..."
read -p "Remove Vite config? (only if you won't use web version) (yes/no): " remove_vite
if [ "$remove_vite" = "yes" ]; then
    remove_if_exists "vite.config.js" "Vite configuration"
    remove_if_exists "vite.config.ts" "Vite TypeScript configuration"
    remove_if_exists "index.html" "Vite entry HTML"
fi

# 5. Remove web-specific source files (if migrated to Android)
echo ""
echo "5. Cleaning web-specific source files..."
read -p "Remove src/ directory? (only if fully migrated to Android) (yes/no): " remove_src
if [ "$remove_src" = "yes" ]; then
    remove_if_exists "src" "Web app source directory"
fi

# 6. Remove public web assets (if not needed)
echo ""
echo "6. Cleaning public web assets..."
read -p "Remove public/ directory? (yes/no): " remove_public
if [ "$remove_public" = "yes" ]; then
    remove_if_exists "public" "Public web assets"
fi

# 7. Remove web-specific scripts
echo ""
echo "7. Cleaning web-specific scripts..."
remove_if_exists "build-android.ps1" "Old PowerShell build script"
remove_if_exists "scripts/generate-icons.js" "Icon generation script"

# 8. Remove node_modules and package files (optional - keep if backend uses them)
echo ""
echo "8. Frontend node_modules..."
read -p "Remove frontend node_modules and package files? (yes/no): " remove_node
if [ "$remove_node" = "yes" ]; then
    remove_if_exists "node_modules" "Node modules"
    remove_if_exists "package-lock.json" "Package lock"
    
    read -p "Remove package.json too? (yes/no): " remove_pkg
    if [ "$remove_pkg" = "yes" ]; then
        remove_if_exists "package.json" "Package.json"
    fi
fi

# 9. Remove ESLint/Prettier configs (if not needed)
echo ""
echo "9. Cleaning linting configs..."
read -p "Remove ESLint/Prettier configs? (yes/no): " remove_lint
if [ "$remove_lint" = "yes" ]; then
    remove_if_exists ".eslintrc.cjs" "ESLint config"
    remove_if_exists ".eslintrc.json" "ESLint JSON config"
    remove_if_exists ".prettierrc" "Prettier config"
fi

# 10. Remove old test file
echo ""
echo "10. Cleaning old test files..."
remove_if_exists "AUTH_DEBUG_TEST.html" "Auth debug test HTML"

# Summary
echo ""
echo "=========================================="
echo "CLEANUP SUMMARY"
echo "=========================================="
echo "Items removed: $REMOVED_COUNT"
echo ""

if [ $REMOVED_COUNT -gt 0 ]; then
    echo "✅ Cleanup complete!"
    echo ""
    echo "Remaining structure:"
    echo "  android/          - Native Android app (KEEP)"
    echo "  backend/          - Backend API server (KEEP)"
    echo "  config/           - Infrastructure configs (KEEP)"
    echo "  .github/          - GitHub workflows (KEEP)"
    echo "  README.md         - Platform documentation (KEEP)"
    echo ""
    echo "Next steps:"
    echo "  1. Test the Android app: cd android && ./gradlew assembleDebug"
    echo "  2. Commit changes: git add -A && git commit -m 'Clean up hybrid files after Android migration'"
    echo "  3. Push to repository"
else
    echo "ℹ️  No files were removed."
fi

echo ""
