#!/bin/bash

# ==============================================================================
# Hemsely Production Deployment Script
# Target Server: /var/www/Hemsely
# ==============================================================================

set -euo pipefail

# ANSI Color Codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo ""
echo "====================================================="
echo "   🚀 Starting Hemsely Production Deployment"
echo "====================================================="
echo ""

# Configuration Paths
PROJECT_ROOT="/var/www/Hemsely"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BACKEND_DIR="$PROJECT_ROOT/backend"
WEB_ROOT="/var/www/html"
UPLOADS_DIR="$BACKEND_DIR/public/uploads"

# 1. Verify Project Directory
if [ ! -d "$PROJECT_ROOT" ]; then
    log_error "Project directory '$PROJECT_ROOT' does not exist!"
    exit 1
fi

cd "$PROJECT_ROOT"

# 2. Pull Latest Code
log_info "📥 Pulling latest code from Git..."
git fetch origin main
git pull origin main
log_success "Git repository updated to latest commit."

# 3. Frontend Deployment
log_info "📦 Installing frontend dependencies..."
cd "$FRONTEND_DIR"

if [ ! -f ".env" ]; then
    log_warn "Frontend .env not found. Ensure VITE_API_URL is configured."
fi

npm install

log_info "🏗️ Building production frontend bundle..."
npm run build

if [ ! -d "dist" ]; then
    log_error "Frontend build failed: 'dist' folder not found!"
    exit 1
fi

log_info "📋 Deploying static files to '$WEB_ROOT'..."
mkdir -p "$WEB_ROOT"
# Clean web root and copy new assets
rm -rf "$WEB_ROOT"/*
cp -r dist/* "$WEB_ROOT"/

# Fix ownership for web server
if id "www-data" &>/dev/null; then
    chown -R www-data:www-data "$WEB_ROOT"
fi

log_success "Frontend deployed successfully to $WEB_ROOT."

# 4. Backend Deployment
log_info "⚙️ Installing backend dependencies..."
cd "$BACKEND_DIR"

if [ ! -f ".env" ]; then
    log_warn "Backend .env file not found! Please ensure environment variables are configured."
fi

npm install

# Ensure Uploads Directories Exist & Have Correct Permissions
log_info "📁 Verifying uploads directory structure..."
mkdir -p "$UPLOADS_DIR/hemsely/profiles"
mkdir -p "$UPLOADS_DIR/hemsely/chats"
mkdir -p "$UPLOADS_DIR/hemsely/selfies"
chmod -R 775 "$UPLOADS_DIR"

if id "www-data" &>/dev/null; then
    chown -R www-data:www-data "$UPLOADS_DIR" 2>/dev/null || true
fi

# 5. PM2 Cluster Zero-Downtime Reload
log_info "🚀 Starting / reloading PM2 cluster..."
if pm2 list | grep -q "hemsely-backend"; then
    pm2 reload ecosystem.config.cjs --env production --update-env
    log_success "Zero-downtime cluster reload executed."
else
    pm2 start ecosystem.config.cjs --env production
    log_success "PM2 cluster started fresh."
fi

pm2 save
log_success "PM2 process list saved."

# 6. Optional Nginx Reload (if installed)
if command -v nginx &>/dev/null; then
    if nginx -t 2>/dev/null; then
        systemctl reload nginx || service nginx reload || true
        log_success "Nginx reloaded successfully."
    else
        log_warn "Nginx configuration test failed; skipped reload."
    fi
fi

# 7. Health Check
log_info "🩺 Checking backend health..."
sleep 2
if command -v curl &>/dev/null; then
    HEALTH_RESP=$(curl -s http://127.0.0.1:5000/api/health || true)
    if [[ "$HEALTH_RESP" == *"Backend is running"* ]]; then
        log_success "Health check passed: Backend is live and healthy!"
    else
        log_warn "Health check endpoint did not return expected response: $HEALTH_RESP"
    fi
fi

# 8. Final Status
echo ""
echo "📊 Current PM2 Status:"
pm2 status

echo ""
echo "====================================================="
echo "   🎉 Hemsely Deployment Completed Successfully!"
echo "====================================================="
echo ""
