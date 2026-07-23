#!/usr/bin/env bash
# deploy.sh — One-command VPS deploy for ibird Portal
# Usage: bash deploy.sh
# Prerequisites: Node.js ≥18, npm, git

set -e

echo "=== ibird Portal Deploy ==="
echo ""

# ── 1. Pull latest code ───────────────────────────────────────────────────────
echo "[1/6] Pulling latest code..."
git pull origin main

# ── 2. Install dependencies ───────────────────────────────────────────────────
echo "[2/6] Installing dependencies..."
npm ci --omit=dev --ignore-scripts
# Re-run scripts only for packages that need postinstall (sharp, prisma)
npm rebuild sharp --if-present
npx prisma generate

# ── 3. Build Next.js ──────────────────────────────────────────────────────────
echo "[3/6] Building Next.js..."
npm run build

# ── 4. Create logs directory ──────────────────────────────────────────────────
echo "[4/6] Ensuring log directory exists..."
mkdir -p logs

# ── 5. Restart via PM2 (install PM2 if missing) ───────────────────────────────
echo "[5/6] Restarting PM2 process..."
if ! command -v pm2 &>/dev/null; then
  echo "  PM2 not found — installing globally..."
  npm install -g pm2
fi

if pm2 list | grep -q "ibird-portal"; then
  pm2 reload ibird-portal --update-env
else
  pm2 start ecosystem.config.js
  pm2 save
  echo ""
  echo "  To survive reboots run: pm2 startup"
  echo "  Then copy-paste the command it prints."
fi

# ── 6. Done ───────────────────────────────────────────────────────────────────
echo ""
echo "[6/6] Deploy complete!"
echo ""
echo "  Portal URL : http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP'):${PORT:-3000}"
echo "  PM2 status : pm2 status"
echo "  Live logs  : pm2 logs ibird-portal"
echo ""
