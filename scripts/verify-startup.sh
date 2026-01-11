#!/bin/bash

# Startup Verification Script Wrapper
# This script runs the TypeScript startup verification helper

# Set script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Change to project root
cd "$PROJECT_ROOT"

# Run the TypeScript verification script
TS_NODE_TRANSPILE_ONLY=1 \
TS_NODE_COMPILER_OPTIONS='{"module":"commonjs","moduleResolution":"node"}' \
ts-node "$SCRIPT_DIR/verify-startup.ts"
