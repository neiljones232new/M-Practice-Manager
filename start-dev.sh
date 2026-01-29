#!/bin/bash

# MDJ Practice Manager Development Startup Script
echo "🚀 Starting MDJ Practice Manager in Development Mode"
echo "=================================================="

# Determine storage path (default to ./storage)
STORAGE_PATH=${STORAGE_PATH:-./storage}

# Check if storage directory exists
if [ ! -d "$STORAGE_PATH" ]; then
    echo "📁 Creating storage directory..."
    mkdir -p "$STORAGE_PATH"/{clients,services,tasks,documents,calendar,compliance,config,events,snapshots,accounts-sets,people,service-templates,task-templates,tax-calculations,templates}
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚙️  Creating environment file..."
    cat > .env << EOF
NODE_ENV=development
STORAGE_PATH=./storage
DATA_DIR=./storage
JWT_SECRET=dev-secret-key-change-in-production
OPENAI_API_KEY=${OPENAI_API_KEY}
COMPANIES_HOUSE_API_KEY=your-companies-house-api-key-here
EOF
fi

echo "🔧 Starting API server..."
cd apps/api && npm run start:dev &
API_PID=$!

echo "🌐 Starting Web server..."
cd ../web && npm run dev &
WEB_PID=$!

echo ""
echo "✅ MDJ Practice Manager is starting up!"
echo ""
echo "📊 Dashboard: http://localhost:3000"
echo "🔌 API: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap "echo '🛑 Stopping services...'; kill $API_PID $WEB_PID 2>/dev/null; exit" INT

wait
