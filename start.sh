#!/bin/bash

echo "🚀 Starting Budget Tracker..."

# Start the Express Backend
cd /Users/prathmeshupadhyay/Downloads/budgettracker
nohup node src/server.js > backend.log 2>&1 &
BACKEND_PID=$!
echo "✅ Backend Webhook Server is running in the background (PID: $BACKEND_PID)"

# Start the Next.js Frontend
cd frontend
nohup npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "✅ Next.js Dashboard is running in the background (PID: $FRONTEND_PID)"

echo "------------------------------------------------------"
echo "🎉 Everything is tracking in real-time!"
echo "👉 Dashboard: http://localhost:3000"
echo "To stop the tracker later, run: kill $BACKEND_PID $FRONTEND_PID"
