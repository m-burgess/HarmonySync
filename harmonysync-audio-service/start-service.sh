#!/bin/bash

# HarmonySync Audio Service Startup Script
# This script starts the Node.js audio service for HarmonySync

SERVICE_DIR="/home/mikeb/projects/RustPresenter/harmonysync-audio-service"
SERVICE_NAME="harmonysync-audio-service"
PID_FILE="$SERVICE_DIR/$SERVICE_NAME.pid"
LOG_FILE="$SERVICE_DIR/$SERVICE_NAME.log"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

# Change to service directory
cd "$SERVICE_DIR" || {
    print_error "Failed to change to service directory: $SERVICE_DIR"
    exit 1
}

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        print_error "Failed to install dependencies"
        exit 1
    fi
fi

# Function to check if service is running
is_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            return 0
        else
            rm -f "$PID_FILE"
            return 1
        fi
    fi
    return 1
}

# Function to start the service
start_service() {
    if is_running; then
        print_warning "Service is already running (PID: $(cat $PID_FILE))"
        return 0
    fi

    print_status "Starting $SERVICE_NAME..."
    
    # Start the service in background
    nohup node server.js > "$LOG_FILE" 2>&1 &
    local pid=$!
    
    # Save PID
    echo $pid > "$PID_FILE"
    
    # Wait a moment and check if it's still running
    sleep 2
    if kill -0 "$pid" 2>/dev/null; then
        print_status "Service started successfully (PID: $pid)"
        print_status "Log file: $LOG_FILE"
        print_status "Health check: http://localhost:3001/api/health"
        return 0
    else
        print_error "Service failed to start"
        rm -f "$PID_FILE"
        return 1
    fi
}

# Function to stop the service
stop_service() {
    if ! is_running; then
        print_warning "Service is not running"
        return 0
    fi

    local pid=$(cat "$PID_FILE")
    print_status "Stopping $SERVICE_NAME (PID: $pid)..."
    
    kill "$pid"
    
    # Wait for graceful shutdown
    local count=0
    while kill -0 "$pid" 2>/dev/null && [ $count -lt 10 ]; do
        sleep 1
        count=$((count + 1))
    done
    
    # Force kill if still running
    if kill -0 "$pid" 2>/dev/null; then
        print_warning "Forcing shutdown..."
        kill -9 "$pid"
    fi
    
    rm -f "$PID_FILE"
    print_status "Service stopped"
}

# Function to restart the service
restart_service() {
    stop_service
    sleep 1
    start_service
}

# Function to show service status
show_status() {
    if is_running; then
        local pid=$(cat "$PID_FILE")
        print_status "Service is running (PID: $pid)"
        
        # Check if port is listening
        if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null; then
            print_status "Port 3001 is listening"
        else
            print_warning "Port 3001 is not listening"
        fi
        
        # Show memory usage
        local memory=$(ps -o rss= -p "$pid" 2>/dev/null)
        if [ -n "$memory" ]; then
            memory_mb=$((memory / 1024))
            print_status "Memory usage: ${memory_mb}MB"
        fi
    else
        print_status "Service is not running"
    fi
}

# Function to show logs
show_logs() {
    if [ -f "$LOG_FILE" ]; then
        tail -f "$LOG_FILE"
    else
        print_error "Log file not found: $LOG_FILE"
    fi
}

# Function to test the service
test_service() {
    if ! is_running; then
        print_error "Service is not running"
        return 1
    fi
    
    print_status "Testing service health..."
    
    # Test health endpoint
    response=$(curl -s -w "%{http_code}" http://localhost:3001/api/health -o /tmp/health_response.json)
    http_code="${response: -3}"
    
    if [ "$http_code" = "200" ]; then
        print_status "Health check passed"
        cat /tmp/health_response.json | jq '.' 2>/dev/null || cat /tmp/health_response.json
    else
        print_error "Health check failed (HTTP $http_code)"
        return 1
    fi
    
    rm -f /tmp/health_response.json
}

# Main script logic
case "$1" in
    start)
        start_service
        ;;
    stop)
        stop_service
        ;;
    restart)
        restart_service
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    test)
        test_service
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs|test}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the audio service"
        echo "  stop    - Stop the audio service"
        echo "  restart - Restart the audio service"
        echo "  status  - Show service status"
        echo "  logs    - Show service logs (tail -f)"
        echo "  test    - Test service health"
        exit 1
        ;;
esac