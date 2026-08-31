#!/usr/bin/env bash
# ==============================================================================
# Zamzam CRM - Oracle Cloud Infrastructure (OCI) Bootstrap & Setup Script
# Target OS: Ubuntu 24.04 / 22.04 LTS (ARM64 / Ampere A1 or x86_64)
#
# Usage:
#   1. SSH into your OCI instance: ssh -i ~/.ssh/oracle_crm ubuntu@<INSTANCE_IP>
#   2. Clone this repo: git clone <YOUR_REPO_URL> /var/www/zamzam-crm
#   3. cd /var/www/zamzam-crm
#   4. chmod +x deploy.sh
#   5. ./deploy.sh
# ==============================================================================

set -euo pipefail

echo "================================================================="
echo "  🌟 Zamzam CRM - Oracle Cloud Always Free Setup"
echo "================================================================="

# Ensure run as non-root (ubuntu user with sudo privileges)
if [ "$EUID" -eq 0 ]; then
    echo "❌ Please run this script as the 'ubuntu' user, not as root."
    exit 1
fi

APP_DIR="/var/www/zamzam-crm"

# ------------------------------------------------------------------------------
# STEP 1: System Packages & Upgrades
# ------------------------------------------------------------------------------
echo "📦 [1/8] Updating system packages and installing prerequisites..."
sudo apt update -y
sudo apt upgrade -y
sudo apt install -y curl git ufw fail2ban nginx certbot python3-certbot-nginx iptables-persistent software-properties-common

# ------------------------------------------------------------------------------
# STEP 2: Install Node.js 22 LTS (ARM64 Compatible) & PM2
# ------------------------------------------------------------------------------
echo "🟢 [2/8] Setting up Node.js 22 LTS & PM2..."
if ! command -v node > /dev/null 2>&1 || [[ $(node -v) != v22* ]]; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt install -y nodejs
fi

echo "Node version: $(node -v)"
echo "NPM version:  $(npm -v)"

# Install PM2 globally
sudo npm install -g pm2

# ------------------------------------------------------------------------------
# STEP 3: Configure OS Firewall & Security (Ports 22, 80, 443 ONLY)
# ------------------------------------------------------------------------------
echo "🔒 [3/8] Hardening OS Firewall (iptables / UFW)..."
# Oracle Cloud Ubuntu images have strict iptables by default.
# We explicitly allow SSH (22), HTTP (80), HTTPS (443) and keep port 3000 strictly internal.

sudo iptables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -C INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo iptables -C INPUT -p tcp --dport 22 -j ACCEPT 2>/dev/null || sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 22 -j ACCEPT

# Save iptables rules so they persist on reboot
sudo netfilter-persistent save

# Configure fail2ban to protect SSH against brute-force attacks
sudo systemctl enable fail2ban
sudo systemctl restart fail2ban

# ------------------------------------------------------------------------------
# STEP 4: Setup Directories and Permissions
# ------------------------------------------------------------------------------
echo "📁 [4/8] Configuring application directories & permissions..."
sudo mkdir -p "$APP_DIR"
sudo mkdir -p /var/log/zamzam-crm
sudo mkdir -p /var/www/certbot
sudo chown -R ubuntu:ubuntu "$APP_DIR"
sudo chown -R ubuntu:ubuntu /var/log/zamzam-crm
sudo chown -R www-data:www-data /var/www/certbot

# ------------------------------------------------------------------------------
# STEP 5: Setup Nginx Reverse Proxy
# ------------------------------------------------------------------------------
echo "🌐 [5/8] Configuring Nginx reverse proxy..."
if [ -f "$APP_DIR/nginx/zamzam-crm.conf" ]; then
    sudo cp "$APP_DIR/nginx/zamzam-crm.conf" /etc/nginx/sites-available/zamzam-crm
    sudo ln -sf /etc/nginx/sites-available/zamzam-crm /etc/nginx/sites-enabled/zamzam-crm
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo nginx -t
    sudo systemctl restart nginx
    sudo systemctl enable nginx
    echo "✅ Nginx configured successfully."
else
    echo "⚠️ Warning: $APP_DIR/nginx/zamzam-crm.conf not found. Skipping Nginx file copy."
fi

# ------------------------------------------------------------------------------
# STEP 6: Check .env Configuration
# ------------------------------------------------------------------------------
echo "⚙️ [6/8] Checking environment configuration..."
if [ ! -f "$APP_DIR/.env" ]; then
    if [ -f "$APP_DIR/.env.production.example" ]; then
        cp "$APP_DIR/.env.production.example" "$APP_DIR/.env"
        echo "⚠️ Created initial $APP_DIR/.env from template."
        echo "👉 PLEASE EDIT $APP_DIR/.env with your production Supabase & Cloudinary credentials!"
    else
        touch "$APP_DIR/.env"
        echo "⚠️ Created blank $APP_DIR/.env."
    fi
fi

# ------------------------------------------------------------------------------
# STEP 7: Build & PM2 Process Registration
# ------------------------------------------------------------------------------
echo "🏗️ [7/8] Installing dependencies and building Next.js standalone..."
cd "$APP_DIR"

if [ -s "$APP_DIR/.env" ]; then
    npm ci
    npx prisma generate
    npm run build

    # Sync static assets for standalone server
    mkdir -p .next/standalone/public
    mkdir -p .next/standalone/.next/static
    cp -r public/* .next/standalone/public/ 2>/dev/null || true
    cp -r .next/static/* .next/standalone/.next/static/ 2>/dev/null || true

    NESTED_DIR=$(find .next/standalone -mindepth 1 -maxdepth 4 -type f -name "server.js" -exec dirname {} \; | head -n 1 || true)
    if [ -n "$NESTED_DIR" ] && [ "$NESTED_DIR" != ".next/standalone" ]; then
        mkdir -p "$NESTED_DIR/public"
        mkdir -p "$NESTED_DIR/.next/static"
        cp -r public/* "$NESTED_DIR/public/" 2>/dev/null || true
        cp -r .next/static/* "$NESTED_DIR/.next/static/" 2>/dev/null || true
    fi

    # Start with PM2
    if pm2 describe zamzam-crm > /dev/null 2>&1; then
        pm2 reload ecosystem.config.js --update-env
    else
        pm2 start ecosystem.config.js
    fi
    pm2 save

    # Configure PM2 to start on system boot
    sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu || true
else
    echo "ℹ️ .env file is empty or template. Please populate $APP_DIR/.env and run: bash scripts/redeploy.sh"
fi

# ------------------------------------------------------------------------------
# STEP 8: Summary & SSL Instructions
# ------------------------------------------------------------------------------
echo ""
echo "================================================================="
echo "🎉 OCI Always Free Setup Completed!"
echo "================================================================="
echo ""
echo "Next Steps:"
echo "1. Verify/Edit your environment file:"
echo "   nano /var/www/zamzam-crm/.env"
echo ""
echo "2. Re-run deployment if you updated .env:"
echo "   bash /var/www/zamzam-crm/scripts/redeploy.sh"
echo ""
echo "3. Point your domain (e.g. crm.yourdomain.com) to this instance Public IP."
echo ""
echo "4. Obtain Free Let's Encrypt SSL certificate:"
echo "   sudo certbot --nginx -d crm.yourdomain.com"
echo ""
echo "5. Check live logs anytime:"
echo "   pm2 logs zamzam-crm"
echo "================================================================="
