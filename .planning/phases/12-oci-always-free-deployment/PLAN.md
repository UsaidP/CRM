# Phase 12 Plan: OCI Always Free Deployment & CI/CD Pipeline

**Phase**: 12  
**Name**: OCI Always Free Deployment & Automated CI/CD  
**Agents**: `/agency-software-architect`, `/agency-devops-automator`  
**Status**: Ready for Execution  

---

## 1. Executive Summary & Architectural Scope

Phase 12 migrates the Zamzam CRM application server from local development to a production deployment on Oracle Cloud Infrastructure (OCI) Always Free Tier. The database (Supabase Postgres) and media storage (Cloudinary) remain unchanged — only the Next.js compute layer moves to an OCI Ampere A1 ARM64 instance.

### Architecture

```
                    Internet
                       │
                 crm.yourdomain.com
                       │
                 ┌─────▼─────┐
                 │   Nginx    │
                 │  80 / 443  │
                 │  (SSL/TLS) │
                 └─────┬─────┘
                       │ proxy_pass
                 ┌─────▼─────┐
                 │    PM2     │
                 │  Next.js   │
                 │ 127.0.0.1  │
                 │   :3000    │
                 └─────┬─────┘
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
       Supabase Postgres     Cloudinary
       (ap-northeast-2)       (CDN)
```

### Cost: $0/month (Always Free)

| Resource | Free Tier Allocation |
|:--|:--|
| Compute | VM.Standard.A1.Flex — up to 4 OCPUs / 24 GB RAM |
| Boot Volume | Up to 200 GB total |
| Outbound | 10 TB/month |
| OS | Ubuntu 24.04 ARM64 |
| Reverse Proxy | Nginx (open source) |
| Process Manager | PM2 (open source) |
| SSL | Let's Encrypt (free) |
| CI/CD | GitHub Actions (free for public repos / 2000 min/month private) |

---

## 2. Domain Decomposition & Responsibility Boundaries

### 2.1 Bounded Contexts

1. **Compute Context** (OCI) — ARM64 instance running the Next.js standalone server behind PM2.
2. **Ingress Context** (Nginx) — TLS termination, static file serving, reverse proxy, gzip compression.
3. **Persistence Context** (Supabase) — Unchanged. PostgreSQL via connection pooler (PgBouncer).
4. **Media Context** (Cloudinary) — Unchanged. Image/video CDN.
5. **Deployment Context** (GitHub Actions → SSH) — Automated build & restart pipeline.

### 2.2 Security Invariants

* **Invariant 1 (No Direct Port Exposure)**: Port 3000 binds ONLY to `127.0.0.1`. The only public ports are 80 (→ 301 redirect to 443) and 443 (TLS).
* **Invariant 2 (SSH-Only Admin Access)**: No password auth. ED25519 key pair only. Fail2ban active.
* **Invariant 3 (Secrets Isolation)**: `.env` lives on-server only, never in git, never in CI logs. GitHub Secrets for CI/CD pipeline.
* **Invariant 4 (Firewall Defense-in-Depth)**: OCI Security List + OS iptables. Both must agree on allowed ports.

---

## 3. Implementation Waves

### Wave 1: Code Changes (Local — Before Server Setup)

#### 3.1 `next.config.js` — Add Standalone Output

```diff
 const nextConfig = {
+  output: 'standalone',
   reactStrictMode: true,
   transpilePackages: ['lucide-react', 'goey-toast'],
```

**Rationale**: `standalone` bundles only required `node_modules` into `.next/standalone/` (~50 MB vs ~500 MB full). The standalone server is a single `server.js` file that includes all dependencies. This is the Next.js-recommended approach for self-hosted deployments.

**Caveat**: Static files (`public/` and `.next/static/`) are NOT bundled into standalone. Nginx serves them directly — faster and avoids Node.js overhead for static assets.

#### 3.2 `deploy.sh` — Server Setup & Deployment Script

New file at project root. Handles:
- System package installation (Node.js 22, PM2, Nginx, Certbot, fail2ban)
- OS firewall rules (iptables: only 80, 443, 22)
- App directory setup (`/var/www/zamzam-crm`)
- Prisma client generation for `linux-arm64-openssl-3.0.x`
- Next.js standalone build
- PM2 ecosystem configuration
- Nginx reverse proxy configuration
- SSL certificate provisioning

#### 3.3 `ecosystem.config.js` — PM2 Configuration

```javascript
module.exports = {
  apps: [{
    name: 'zamzam-crm',
    script: '.next/standalone/server.js',
    cwd: '/var/www/zamzam-crm',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOSTNAME: '127.0.0.1',
    },
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '512M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: '/var/log/zamzam-crm/error.log',
    out_file: '/var/log/zamzam-crm/access.log',
    merge_logs: true,
  }],
};
```

#### 3.4 `nginx/zamzam-crm.conf` — Nginx Configuration

```nginx
server {
    listen 80;
    server_name crm.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name crm.yourdomain.com;

    # SSL (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/crm.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/crm.yourdomain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1000;
    gzip_proxied any;

    # Next.js static assets — served directly by Nginx
    location /_next/static {
        alias /var/www/zamzam-crm/.next/static;
        expires 365d;
        access_log off;
        add_header Cache-Control "public, immutable";
    }

    # Public assets
    location /public {
        alias /var/www/zamzam-crm/public;
        expires 30d;
        access_log off;
    }

    # Favicon
    location = /favicon.ico {
        alias /var/www/zamzam-crm/public/favicon.ico;
        access_log off;
    }

    # Proxy to Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts for SSR
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

#### 3.5 `.github/workflows/deploy.yml` — GitHub Actions CI/CD

```yaml
name: Deploy to OCI

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.OCI_HOST }}
          username: ubuntu
          key: ${{ secrets.OCI_SSH_KEY }}
          script: |
            cd /var/www/zamzam-crm
            git pull origin main
            npm ci --omit=dev
            npx prisma generate
            npm run build
            # Copy static assets into standalone
            cp -r public .next/standalone/public
            cp -r .next/static .next/standalone/.next/static
            pm2 restart zamzam-crm
```

#### 3.6 `scripts/redeploy.sh` — Manual Redeployment Script

For SSH-based manual deploys when CI/CD isn't needed:

```bash
#!/bin/bash
set -euo pipefail

cd /var/www/zamzam-crm
echo "🔄 Pulling latest code..."
git pull origin main

echo "📦 Installing dependencies..."
npm ci --omit=dev

echo "🗄️ Generating Prisma client..."
npx prisma generate

echo "🏗️ Building Next.js..."
npm run build

echo "📁 Copying static assets to standalone..."
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static

echo "🔄 Restarting PM2..."
pm2 restart zamzam-crm

echo "✅ Deployment complete!"
pm2 status
```

#### 3.7 `.env.production.example` — Production Environment Template

Sanitized template documenting every required env var with production notes.

---

### Wave 2: OCI Instance Provisioning (Manual — OCI Console)

| Step | Action | Detail |
|:--|:--|:--|
| 2.1 | Create OCI account | [cloud.oracle.com](https://cloud.oracle.com) → Always Free |
| 2.2 | Select region | `ap-mumbai-1` (Mumbai) — lowest latency to Indian users |
| 2.3 | Create compute | VM.Standard.A1.Flex, 1 OCPU, 6 GB RAM, Ubuntu 24.04 |
| 2.4 | Boot volume | **100 GB** (leaves room for build artifacts, logs, npm cache) |
| 2.5 | SSH key | Upload `~/.ssh/oracle_crm.pub` |
| 2.6 | Security list | Ingress: TCP 22 (your IP only), TCP 80 (0.0.0.0/0), TCP 443 (0.0.0.0/0) |

> **Note**: Do NOT expose port 3000 in the security list. Nginx handles all public traffic.

### Wave 3: Server Bootstrap (SSH — Run `deploy.sh`)

```bash
# SSH into the new instance
ssh -i ~/.ssh/oracle_crm ubuntu@<INSTANCE_IP>

# Clone repo and run setup
git clone <REPO_URL> /var/www/zamzam-crm
cd /var/www/zamzam-crm
chmod +x deploy.sh
./deploy.sh
```

The script handles everything: system packages, firewall, Node.js, PM2, Nginx, app build, SSL.

### Wave 4: DNS & SSL (Manual)

| Step | Action |
|:--|:--|
| 4.1 | Point `crm.yourdomain.com` A record → OCI instance public IP |
| 4.2 | Wait for DNS propagation (~5 min) |
| 4.3 | Run `sudo certbot --nginx -d crm.yourdomain.com` |
| 4.4 | Verify auto-renewal: `sudo certbot renew --dry-run` |

### Wave 5: GitHub Actions Setup (Optional)

| Step | Action |
|:--|:--|
| 5.1 | Add `OCI_HOST` secret (instance public IP) |
| 5.2 | Add `OCI_SSH_KEY` secret (private key contents) |
| 5.3 | Push `.github/workflows/deploy.yml` |
| 5.4 | Test: push to `main`, verify auto-deploy |

---

## 4. File Manifest

| File | Action | Purpose |
|:--|:--|:--|
| `next.config.js` | MODIFY | Add `output: 'standalone'` |
| `deploy.sh` | NEW | Full server setup script |
| `ecosystem.config.js` | NEW | PM2 process configuration |
| `nginx/zamzam-crm.conf` | NEW | Nginx reverse proxy + SSL |
| `scripts/redeploy.sh` | NEW | Manual redeployment helper |
| `.env.production.example` | NEW | Production env var template |
| `.github/workflows/deploy.yml` | NEW | GitHub Actions CI/CD pipeline |

---

## 5. Verification Plan

### 5.1 Pre-Deployment (Local)

```bash
# Verify standalone build works
npm run build
ls -la .next/standalone/server.js  # should exist

# Verify Prisma generates without errors
npx prisma generate
```

### 5.2 Server Health Checks

```bash
# SSH into server, then:

# PM2 is running
pm2 status                        # should show 'zamzam-crm' online

# App responds on localhost
curl -s http://127.0.0.1:3000/api/v1/health | jq .
# Expected: { "status": "healthy", ... }

# Nginx is proxying
curl -sI http://localhost
# Expected: HTTP/1.1 200 or 301

# Firewall is correct
sudo iptables -L INPUT -n --line-numbers
# Should show: 22, 80, 443 only
```

### 5.3 External Verification

```bash
# From your local machine:
curl -sI https://crm.yourdomain.com
# Expected: HTTP/2 200, valid SSL cert

# Health endpoint
curl -s https://crm.yourdomain.com/api/v1/health | jq .

# SSL certificate check
echo | openssl s_client -connect crm.yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates
```

### 5.4 Functional Tests

- [ ] Login with `admin@zamzamproperties.in`
- [ ] Leads page loads with data from Supabase
- [ ] Images render from Cloudinary
- [ ] Portal pages (`/p/[token]`) accessible without auth
- [ ] API routes return correct responses
- [ ] CI/CD: push a trivial change to `main` → verify auto-deploy

### 5.5 Monitoring

```bash
# PM2 monitoring
pm2 monit                         # live CPU/memory dashboard
pm2 logs zamzam-crm --lines 50   # recent logs

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Disk usage
df -h                             # boot volume usage
du -sh /var/www/zamzam-crm/.next  # build artifact size
```

---

## 6. Rollback Strategy

| Scenario | Action |
|:--|:--|
| Bad deploy breaks the app | `git checkout <previous-sha> && npm run build && pm2 restart zamzam-crm` |
| PM2 crashes | `pm2 resurrect` (restores saved process list) |
| Nginx config breaks | `sudo nginx -t` catches errors before restart |
| SSL cert expires | `sudo certbot renew` (cron auto-runs this) |
| Instance becomes unavailable | Redeploy on new Always Free instance from git repo |

---

## 7. ADR: Self-Hosted OCI vs Managed Platforms

### Status
Accepted

### Context
Need production hosting for Zamzam CRM at $0/month. Considered: Vercel Free (serverless limits, 10s function timeout), Railway (hobby tier deprecated), Render (free tier has cold starts), OCI Always Free (persistent VM, no limits).

### Decision
Deploy on OCI Always Free ARM instance with Nginx + PM2. Database remains on Supabase. Media on Cloudinary.

### Consequences
**Easier**: Full server control, no vendor cold starts, no function timeout limits, persistent process, real SSH access for debugging.  
**Harder**: Manual server maintenance (OS updates, SSL renewal handled by cron), no auto-scaling (single instance), requires basic DevOps knowledge.
