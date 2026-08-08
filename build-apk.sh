#!/usr/bin/env bash
set -e

# ==============================================================================
# MessChain Android Build Script
# Builds production/preview release APK for Android
# ==============================================================================

echo "🚀 [MessChain] Starting Android Release APK Build..."

# 1. Ensure required environment variables
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

if [ ! -d "$ANDROID_HOME" ]; then
    echo "⚠️ Warning: ANDROID_HOME not found at $ANDROID_HOME."
    echo "   Ensure Android SDK is installed and ANDROID_HOME is set in your environment."
fi

# 2. Check Java version (JDK 17 recommended for Expo SDK 56 / RN 0.85)
if command -v java >/dev/null 2>&1; then
    echo "☕ Java Version: $(java -version 2>&1 | head -n 1)"
else
    echo "❌ Error: Java (JDK 17) is not installed or not in PATH."
    exit 1
fi

# 3. Check and install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node dependencies..."
    npm install
fi

# 4. Make gradlew executable
chmod +x ./android/gradlew

# 5. Clean prior build artifacts (optional / safe)
echo "🧹 Cleaning previous Gradle build cache..."
./android/gradlew -p android clean --no-daemon

# 6. Assemble Release APK
echo "🔨 Compiling Android Release APK (assembleRelease)..."
./android/gradlew -p android assembleRelease --no-daemon --stacktrace

# 7. Locate generated APK
APK_PATH="android/app/build/outputs/apk/release/app-release.apk"

if [ -f "$APK_PATH" ]; then
    echo ""
    echo "======================================================================"
    echo "🎉 Build Successful!"
    echo "📱 Release APK Location: $(pwd)/$APK_PATH"
    echo "📦 APK Size: $(du -h "$APK_PATH" | cut -f1)"
    echo "======================================================================"
else
    echo ""
    echo "⚠️ Build completed, looking for APK outputs:"
    find android/app/build/outputs/apk -name "*.apk"
fi
