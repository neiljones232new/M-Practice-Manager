#!/usr/bin/env bash
set -euo pipefail

# Build a tiny macOS app (AppleScript) that runs the local launcher
# and returns immediately. Useful so a double-clickable app will start
# the backend servers and open the nativefier app for testing.

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$REPO_ROOT/dist-native"
RUNNER="$DIST_DIR/run-local-native.sh"
WRAPPER_NAME="MDJ Practice Manager Launcher"
OUT_APP="$DIST_DIR/${WRAPPER_NAME}.app"

if [[ ! -f "$RUNNER" ]]; then
  echo "Error: runner not found at $RUNNER" >&2
  echo "Please create the runner (dist-native/run-local-native.sh) first." >&2
  exit 1
fi

mkdir -p "$DIST_DIR"

tmpfile=$(mktemp /tmp/mdj-wrapper-XXXX.applescript)
trap 'rm -f "$tmpfile"' EXIT

cat > "$tmpfile" <<APPSCRIPT
-- Run the local launcher in background and exit immediately
do shell script "/bin/bash -lc '\"$RUNNER\" >/tmp/mdj-launcher.log 2>&1 &'"
APPSCRIPT

echo "Building Automator/AppleScript app -> $OUT_APP"

# Compile the AppleScript into an application bundle
osacompile -o "$OUT_APP" "$tmpfile"

if [[ -d "$OUT_APP" ]]; then
  echo "Created: $OUT_APP"
  echo "You can double-click this app to start servers + open the native app."
else
  echo "Failed to create app bundle." >&2
  exit 1
fi

# If a custom icon exists in repo root, attach it to the generated wrapper app
ICON_SRC="$REPO_ROOT/mdj.icns"
if [[ -f "$ICON_SRC" ]]; then
  RES_DIR="$OUT_APP/Contents/Resources"
  mkdir -p "$RES_DIR"
  cp "$ICON_SRC" "$RES_DIR/applet.icns"
  # Set CFBundleIconFile in Info.plist
  PLIST="$OUT_APP/Contents/Info.plist"
  if /usr/libexec/PlistBuddy -c "Print :CFBundleIconFile" "$PLIST" >/dev/null 2>&1; then
    /usr/libexec/PlistBuddy -c "Set :CFBundleIconFile applet.icns" "$PLIST" || true
  else
    /usr/libexec/PlistBuddy -c "Add :CFBundleIconFile string applet.icns" "$PLIST" || true
  fi
  # Refresh Finder icon cache
  /usr/bin/qlmanage -r >/dev/null 2>&1 || true
  echo "Set custom icon for wrapper app from $ICON_SRC"
fi

# Create a PNG copy of the icon for the HTML splash (if possible)
SPLASH_PNG="$DIST_DIR/mdj.png"
if [[ -f "$ICON_SRC" ]]; then
  if command -v sips >/dev/null 2>&1; then
    sips -s format png "$ICON_SRC" --out "$SPLASH_PNG" >/dev/null 2>&1 || true
  fi
  # If conversion failed, try extracting from the .app icon resources
  if [[ ! -f "$SPLASH_PNG" ]] && [[ -d "$REPO_ROOT/MDJ Practice Manager-darwin-arm64/MDJ Practice Manager.app/Contents/Resources" ]]; then
    cp "$REPO_ROOT/MDJ Practice Manager-darwin-arm64/MDJ Practice Manager.app/Contents/Resources/electron.icns" "$SPLASH_PNG" 2>/dev/null || true
  fi
fi

# Ensure the splash HTML exists in dist-native (we ship one in the repo but ensure copy)
SPLASH_SRC="$REPO_ROOT/dist-native/launcher-splash.html"
if [[ -f "$SPLASH_SRC" ]]; then
  cp "$SPLASH_SRC" "$DIST_DIR/launcher-splash.html"
  # If mdj.png was generated, copy it next to the splash
  if [[ -f "$SPLASH_PNG" ]]; then
    cp "$SPLASH_PNG" "$DIST_DIR/mdj.png" || true
  fi
fi

exit 0
