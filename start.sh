#!/bin/bash

echo "🚀 Starting Hub API Server..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "📦 Starting Docker services (PostgreSQL + Redis)..."
docker compose up -d

echo "⏳ Waiting for services to be ready..."
sleep 3

echo "🗄️ Running database migrations..."
bun run src/db/migrate.ts

echo "🌟 Starting development server..."
echo "📍 Server: http://localhost:4000"
echo "📚 Docs: http://localhost:4000/docs"
echo "📄 OpenAPI: http://localhost:4000/swagger/json"
echo ""

bun run dev
