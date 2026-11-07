#!/data/data/com.termux/files/usr/bin/bash
cd /data/data/com.termux/files/home/apex-anime-platform

echo "⚡ Stopping any previous server instance..."
pkill -f "node server/index.js" 2>/dev/null || true
sleep 1

if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies (first time only)..."
  npm install
fi

echo "🚀 Launching APEX Server on http://localhost:3000"
node server/index.js
