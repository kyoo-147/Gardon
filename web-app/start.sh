#!/bin/bash

# ESP32 MQTT Control Center - Start Script
echo "🚀 Starting ESP32 MQTT Control Center..."

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -ti:$port > /dev/null 2>&1; then
        echo "⚠️  Port $port is already in use!"
        return 1
    fi
    return 0
}

# Function to start backend
start_backend() {
    echo "🟢 Starting Backend Server (Port 3001)..."
    cd backend
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing backend dependencies..."
        npm install
    fi
    npm run dev &
    BACKEND_PID=$!
    cd ..
    echo "✅ Backend started with PID: $BACKEND_PID"
}

# Function to start frontend  
start_frontend() {
    echo "🟢 Starting Frontend Server (Port 5173)..."
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing frontend dependencies..."
        npm install
    fi
    npm run dev &
    FRONTEND_PID=$!
    echo "✅ Frontend started with PID: $FRONTEND_PID"
}

# Function to cleanup processes
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        echo "❌ Backend stopped"
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        echo "❌ Frontend stopped"
    fi
    echo "👋 ESP32 MQTT Control Center stopped"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup INT TERM

# Check if ports are available
if ! check_port 3001; then
    echo "Please stop the process using port 3001 or change the backend port"
    exit 1
fi

if ! check_port 5173; then
    echo "Please stop the process using port 5173 or change the frontend port"
    exit 1
fi

# Start services
start_backend
sleep 3  # Give backend time to start
start_frontend

echo ""
echo "🎉 ESP32 MQTT Control Center is running!"
echo "📱 Frontend: http://localhost:5173"
echo "🔧 Backend:  http://localhost:3001"
echo "📊 Health:   http://localhost:3001/health"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID
