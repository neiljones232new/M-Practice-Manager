#!/bin/bash

# Clear Test Data Script
# This script removes all test data from the database while preserving the schema

set -e

echo "🧹 Clearing test data from MDJ Practice Manager database..."

# Check if we're in the right directory
if [ ! -f "apps/api/prisma/schema.prisma" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Navigate to API directory
cd apps/api

# Run the TypeScript clearing script
echo "📋 Running data clearing script..."
npx tsx ../../scripts/clear-test-data.ts

cd ../..