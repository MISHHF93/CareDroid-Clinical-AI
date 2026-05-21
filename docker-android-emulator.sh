#!/bin/bash

# Docker Android Emulator Setup Script

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║      🐳 DOCKER ANDROID EMULATOR SETUP                         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo ""
    echo "Install Docker:"
    echo "  macOS: brew install docker"
    echo "  Ubuntu: sudo apt-get install docker.io"
    echo "  Windows: Download from https://www.docker.com/products/docker-desktop"
    exit 1
fi

echo "✅ Docker is installed: $(docker --version)"
echo ""

# Check if Dockerfile exists
if [ ! -f "Dockerfile.android" ]; then
    echo "❌ Dockerfile.android not found!"
    echo "Make sure you're in the CareDroid-Ai directory."
    exit 1
fi

echo "📦 Building Docker image..."
echo "   This will take 10-15 minutes on first build (downloading Android SDK, emulator, etc.)"
echo ""

# Build Docker image
docker build -f Dockerfile.android -t caredroid-android:latest .

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Docker image built successfully!"
    echo ""
    echo "🚀 Running container..."
    echo "   • Allocating 4GB RAM"
    echo "   • Allocating 4 CPU cores"
    echo "   • VNC server on port 5900"
    echo ""
    
    # Run Docker container with proper resource allocation
    docker run -it \
        --name caredroid-emulator \
        -m 4g \
        --cpus=4 \
        -p 5900:5900 \
        -p 5037:5037 \
        -p 8080:8080 \
        -v "$(pwd):/workspace" \
        caredroid-android:latest
else
    echo ""
    echo "❌ Docker build failed!"
    exit 1
fi
