#!/bin/bash
echo "🚀 Starting V-GPU Backend..."
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 &

echo "🖥️ Starting Vite Dev Server..."
npm run dev --prefix frontend &

echo "⏳ Waiting 5 seconds for servers to initialize..."
sleep 5

echo "🖥️ Launching V-GPU Desktop App..."
cd frontend
npm run electron
