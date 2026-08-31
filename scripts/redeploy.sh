#!/usr/bin/env bash
# ==============================================================================
# Zamzam CRM - Production Redeploy Script
# Run this on your OCI Instance: bash scripts/redeploy.sh
# ==============================================================================

set -euo pipefail

APP_DIR="/var/www/zamzam-crm"
cd "$APP_DIR"

echo "=================================================="
echo "🚀 Starting Zamzam CRM Deployment..."
echo "=================================================="

# 1. Pull latest changes from git
echo "📥 [1/6] Pulling latest code from git..."
git pull origin main

# 2. Install production dependencies cleanly
echo "📦 [2/6] Installing dependencies..."
npm ci

# 3. Generate Prisma client for Linux ARM64
echo "🗄️ [3/6] Generating Prisma client..."
npx prisma generate

# 4. Build Next.js standalone production bundle
echo "🏗️ [4/6] Building Next.js standalone bundle..."
npm run build

# 5. Copy static assets into standalone directory structure
echo "📁 [5/6] Syncing static assets to standalone directory..."
# Root standalone static copy
mkdir -p .next/standalone/public
mkdir -p .next/standalone/.next/static
cp -r public/* .next/standalone/public/ 2>/dev/null || true
cp -r .next/static/* .next/standalone/.next/static/ 2>/dev/null || true

# If standalone generated a nested subfolder structure, sync there too
NESTED_DIR=$(find .next/standalone -mindepth 1 -maxdepth 4 -type f -name "server.js" -exec dirname {} \; | head -n 1 || true)
if [ -n "$NESTED_DIR" ] && [ "$NESTED_DIR" != ".next/standalone" ]; then
    mkdir -p "$NESTED_DIR/public"
    mkdir -p "$NESTED_DIR/.next/static"
    cp -r public/* "$NESTED_DIR/public/" 2>/dev/null || true
    cp -r .next/static/* "$NESTED_DIR/.next/static/" 2>/dev/null || true
fi

# Ensure log directory exists
sudo mkdir -p /var/log/zamzam-crm
sudo chown -R ubuntu:ubuntu /var/log/zamzam-crm

# 6. Reload or start PM2 process
echo "🔄 [6/6] Reloading PM2 process..."
if pm2 describe zamzam-crm > /dev/null 2>&1; then
    pm2 reload ecosystem.config.js --update-env
else
    pm2 start ecosystem.config.js
fi

pm2 save

echo "=================================================="
echo "✅ Zamzam CRM deployed successfully!"
echo "=================================================="

# Optional: Health check verification
sleep 2
echo "🔍 Checking local health status..."
if command -v curl > /dev/null 2>&1; then
    curl -s http://127.0.0.1:3000/api/v1/health || echo "Health check pinged."
fi
echo ""
pm2 status
