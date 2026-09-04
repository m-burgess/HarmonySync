#!/bin/bash
# Launches HarmonySync host and the Web Client

echo "Starting HarmonySync Main App..."
./build/harmonysync_app &
MAIN_PID=$!

echo "Starting Web Client server..."
cd src/web_client && npm run dev &
WEB_PID=$!

echo "Both apps are now running in the background."
echo "Main App running locally."
echo "Web App available at: http://localhost:3000"
echo "To close them, you can close the windows or run: kill $MAIN_PID $WEB_PID"

# Wait for both background processes
wait
