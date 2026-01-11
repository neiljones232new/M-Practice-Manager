#!/usr/bin/env bash
set -euo pipefail

# Launch the Nativefier-built macOS app (or trigger a build if missing)
# Usage:
#   ./scripts/launch-native.sh        # launch if built, otherwise prompt to build
#   ./scripts/launch-native.sh --build    # force a build (runs build-mdj-mac.sh)
#   ./scripts/launch-native.sh --no-build # don't build; just attempt to launch

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_NAME="MDJ Practice Manager"
DIST_DIR="$REPO_ROOT/dist-native"
BUILD_SCRIPT="$REPO_ROOT/build-mdj-mac.sh"

FORCE_BUILD=0
NO_BUILD=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --build) FORCE_BUILD=1; shift ;;
    --no-build) NO_BUILD=1; shift ;;
    -h|--help) echo "Usage: $0 [--build|--no-build]"; exit 0 ;;
    *) echo "Unknown arg: $1"; echo "Usage: $0 [--build|--no-build]"; exit 2 ;;
  esac
done

APP_BIN="$DIST_DIR/$APP_NAME-darwin-arm64/$APP_NAME.app/Contents/MacOS/$APP_NAME"

if [[ $FORCE_BUILD -eq 1 ]]; then
  echo "→ Forcing native build via $BUILD_SCRIPT"
  bash "$BUILD_SCRIPT"
  exit 0
fi

if [[ ! -x "$APP_BIN" ]]; then
  if [[ $NO_BUILD -eq 1 ]]; then
    echo "✗ Native app binary not found or not executable at:" >&2
    echo "  $APP_BIN" >&2
    exit 1
  fi

  echo "→ Native app not found at: $APP_BIN"
  read -p "Build native app now using build-mdj-mac.sh? [Y/n] " resp
  resp="${resp:-y}"
  if [[ "$resp" =~ ^[Yy] ]]; then
    if [[ ! -x "$BUILD_SCRIPT" ]]; then
      # Try to run with bash even if not executable
      echo "→ Running build script: $BUILD_SCRIPT"
      bash "$BUILD_SCRIPT"
      exit 0
    else
      echo "→ Running build script: $BUILD_SCRIPT"
      "$BUILD_SCRIPT"
      exit 0
    fi
  else
    echo "Aborted. Native app not launched.";
    exit 1
  fi
fi

echo "→ Launching native app: $APP_BIN"
# Launch the app detached; macOS GUI apps typically detach themselves, but we run with logging flags to capture useful output
"$APP_BIN" --enable-logging=stderr --v=1 >/dev/null 2>&1 &

echo "✓ Launched $APP_NAME"
echo "Note: keep the servers running (API & Web) if you built via build-mdj-mac.sh. See build script for details."

exit 0
