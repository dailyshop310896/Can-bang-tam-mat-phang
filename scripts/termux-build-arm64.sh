#!/data/data/com.termux/files/usr/bin/bash
# Build Can bang tam - mat phang on a 64-bit Android phone using Termux.
# This is a DEBUG build for diagnosing app startup; it does not use a release keystore.
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID="$ROOT/android"
LOG="$ROOT/termux-arm64-build.log"
SDK="${PREFIX:-/data/data/com.termux/files/usr}/opt/android-sdk"

echo "=== Can bang tam - ARM64-only Termux build ==="
if [[ ! -f "$ANDROID/gradlew" ]]; then
  echo "Khong tim thay android/gradlew."
  echo "Neu chua co Android project, tai thu muc goc chay: npx expo prebuild --platform android"
  exit 1
fi
if [[ ! -d "$SDK/platforms" ]]; then
  echo "Khong tim thay Android SDK: $SDK"
  exit 1
fi

export ANDROID_HOME="$SDK"
export ANDROID_SDK_ROOT="$SDK"
export CMAKE_BUILD_PARALLEL_LEVEL=1

# Keep the prebuilt native tree, but correct SDK and architecture in local-only files.
mkdir -p "$ANDROID"
if [[ -f "$ANDROID/local.properties" ]]; then
  sed -i '/^sdk\.dir=/d' "$ANDROID/local.properties"
fi
printf 'sdk.dir=%s\n' "$SDK" >> "$ANDROID/local.properties"

if [[ -f "$ANDROID/gradle.properties" ]]; then
  sed -i '/^reactNativeArchitectures=/d' "$ANDROID/gradle.properties"
fi
printf 'reactNativeArchitectures=arm64-v8a\n' >> "$ANDROID/gradle.properties"

cd "$ROOT"
if command -v pnpm >/dev/null 2>&1; then
  echo "=== Dong bo dependency voi GitHub ==="
  pnpm install --frozen-lockfile
else
  echo "Khong thay pnpm. Cai pnpm truoc khi build."
  exit 1
fi

echo "=== Gradle ARM64 debug; log: $LOG ==="
cd "$ANDROID"
chmod +x gradlew
set +e
./gradlew :app:assembleDebug \
  -PreactNativeArchitectures=arm64-v8a \
  --max-workers=1 \
  --no-daemon \
  --console=plain 2>&1 | tee "$LOG"
result=${PIPESTATUS[0]}
set -e
if (( result != 0 )); then
  echo "BUILD FAILED (exit $result). Xem 80 dong cuoi log:"
  tail -n 80 "$LOG"
  exit "$result"
fi

APK="$ANDROID/app/build/outputs/apk/debug/app-debug.apk"
if [[ ! -s "$APK" ]]; then
  echo "Gradle thanh cong nhung khong tim thay APK: $APK"
  exit 1
fi

echo "=== BUILD SUCCESS ==="
echo "APK: $APK"
if [[ -d /sdcard/Download && -w /sdcard/Download ]]; then
  DEST="/sdcard/Download/Can-Bang-Tam-Mat-Phang-ARM64-Debug.apk"
  cp -f "$APK" "$DEST"
  echo "Da copy den: $DEST"
else
  echo "Chua co quyen ghi /sdcard/Download. APK van nam tai: $APK"
fi
echo "Luu y: Debug APK khong dung khoa ky Release, co the khong cai de ban Release."
