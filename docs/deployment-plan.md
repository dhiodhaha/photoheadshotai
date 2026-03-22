# Deployment Plan: VPS (Jetorbit) from 0 to 1

## Context

The Professional AI Headshot Studio needs to be deployed to production on a Jetorbit VPS. The app already has a production-ready Dockerfile with 3-stage build and auto-migration entrypoint. Domain is ready with Cloudflare DNS. We need: Docker + PostgreSQL on VPS, production docker-compose, GitHub Actions CI/CD, and Cloudflare SSL.

---

## Phase 1: VPS Initial Setup (Manual, one-time)

SSH into the Jetorbit VPS and run these setup steps.

### 1.1 Install Docker + Docker Compose

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose plugin
sudo apt install docker-compose-plugin -y

# Verify
docker --version
docker compose version
```

### 1.2 Create App Directory

```bash
mkdir -p /opt/photoheadshot
cd /opt/photoheadshot
```

### 1.3 Create `.env.production` on VPS

```bash
nano /opt/photoheadshot/.env.production
```

Contents:
```env
# Database (internal Docker network — no external exposure)
DATABASE_URL=postgresql://photoheadshot:STRONG_PASSWORD_HERE@postgres:5432/photoheadshotdb

# Auth
BETTER_AUTH_URL=https://yourdomain.com
BETTER_AUTH_SECRET=<generate with: pnpm dlx @better-auth/cli secret>

# R2 Storage
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=xxx
R2_PUBLIC_URL=https://cdn.yourdomain.com

# Email (Resend)
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=Studio AI <noreply@yourdomain.com>

# AI
FAL_KEY=xxx
MOCK_AI_GENERATION=false
```

---

## Phase 2: Production Docker Compose

### New File: `docker-compose.prod.yml`

```yaml
services:
  postgres:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: photoheadshot
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: photoheadshotdb
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U photoheadshot"]
      interval: 5s
      timeout: 3s
      retries: 5

  app:
    image: ghcr.io/dhiodhaha/photoheadshot:latest
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000"
    env_file:
      - .env.production
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  pgdata:
```

**Key decisions:**
- App binds to `127.0.0.1:3000` (not public) — Nginx reverse-proxies to it
- PostgreSQL is internal only (no exposed ports)
- `ghcr.io` (GitHub Container Registry) — GitHub Actions pushes Docker image here
- Health check ensures DB is ready before app starts

---

## Phase 3: Reverse Proxy (Nginx) + Tailscale SSH

### 3.1 Nginx as Reverse Proxy

Nginx runs on the host (not in Docker) to proxy public traffic to the app container.

**Install Nginx:**
```bash
sudo apt install nginx -y
sudo systemctl enable nginx
```

**New File on VPS: `/etc/nginx/sites-available/photoheadshot`**

```nginx
server {
    listen 80;
    listen 443 ssl http2;
    server_name yourdomain.com;

    # Cloudflare Origin Certificate (generate in Cloudflare dashboard)
    ssl_certificate /etc/ssl/cloudflare/origin.pem;
    ssl_certificate_key /etc/ssl/cloudflare/origin-key.pem;

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
    }
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/photoheadshot /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

**Cloudflare Origin Certificate (15-year free cert):**
1. Cloudflare → SSL/TLS → Origin Server → Create Certificate
2. Save `origin.pem` and `origin-key.pem` to `/etc/ssl/cloudflare/` on VPS
3. Set Cloudflare SSL mode to **Full (Strict)**

### 3.2 Tailscale for Secure SSH

Tailscale creates a private WireGuard VPN. SSH goes through Tailscale — **port 22 is never exposed to the internet**. No Fail2ban needed.

**Install on VPS:**
```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --ssh
```

**Install on your Mac:**
```bash
brew install tailscale
tailscale up
```

**After both are connected:**
```bash
# SSH via Tailscale hostname (no IP needed)
ssh deploy@your-vps-tailscale-hostname
```

**Update GitHub Actions SSH:** Use Tailscale in the CI/CD pipeline too (see Phase 4 update).

---

## Phase 4: GitHub Actions CI/CD

### New File: `.github/workflows/deploy.yml`

Triggers on push to `main`. Builds Docker image, pushes to GHCR, SSHs into VPS to pull + restart.

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: |
            ghcr.io/${{ github.repository }}:latest
            ghcr.io/${{ github.repository }}:${{ github.sha }}

      - name: Setup Tailscale
        uses: tailscale/github-action@v3
        with:
          oauth-client-id: ${{ secrets.TS_OAUTH_CLIENT_ID }}
          oauth-secret: ${{ secrets.TS_OAUTH_SECRET }}
          tags: tag:ci

      - name: Deploy to VPS via Tailscale
        run: |
          ssh -o StrictHostKeyChecking=no deploy@${{ secrets.VPS_TAILSCALE_HOSTNAME }} << 'EOF'
            cd /opt/photoheadshot
            docker compose -f docker-compose.prod.yml pull app
            docker compose -f docker-compose.prod.yml up -d
            docker image prune -f
          EOF
```

### GitHub Secrets Required

Set in repo → Settings → Secrets → Actions:

| Secret | Value |
|--------|-------|
| `TS_OAUTH_CLIENT_ID` | Tailscale OAuth client ID (admin console → Settings → OAuth) |
| `TS_OAUTH_SECRET` | Tailscale OAuth client secret |
| `VPS_TAILSCALE_HOSTNAME` | Tailscale hostname of VPS (e.g. `my-vps`) |

`GITHUB_TOKEN` is auto-provided — no setup needed for GHCR push.

**Tailscale ACL tag:** Add `tag:ci` in Tailscale admin → Access Controls so the GitHub runner can SSH to VPS.

### VPS: Allow GHCR Pull

On VPS, log in to GHCR once:
```bash
echo "GITHUB_PAT" | docker login ghcr.io -u dhiodhaha --password-stdin
```

---

## Phase 5: Cloudflare DNS Config

1. Go to Cloudflare → DNS → Add A record:
   - **Name:** `@` (or subdomain)
   - **Content:** VPS IP address
   - **Proxy:** Orange cloud ON (proxied)

2. SSL/TLS → Set to **Full (Strict)**

3. (Optional) Add `www` CNAME → `yourdomain.com`

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `docker-compose.prod.yml` | **New** | Production compose (app + postgres) |
| `nginx/photoheadshot.conf` | **New** | Nginx reverse proxy config (reference, applied on VPS) |
| `.github/workflows/deploy.yml` | **New** | CI/CD pipeline |
| `.env.production.example` | **New** | Template for production env vars |

No changes to existing application code.

---

## Deployment Flow (after setup)

```
Developer pushes to main
  → GitHub Actions builds Docker image
  → Pushes to ghcr.io
  → Connects to VPS via Tailscale SSH
  → docker compose pull + up -d
  → Entrypoint runs prisma migrate deploy
  → App starts on :3000
  → Nginx reverse-proxies with Cloudflare Origin cert
  → Cloudflare proxies with CDN + DDoS protection
```

---

## Verification Steps

1. **Build locally:** `docker build -t photoheadshot .` — should succeed
2. **Test compose:** `docker compose -f docker-compose.prod.yml up` on VPS
3. **Check app:** `curl http://localhost:3000` on VPS — should return HTML
4. **Check HTTPS:** Visit `https://yourdomain.com` — should load app
5. **Test CI/CD:** Push a small change to `main` — should auto-deploy within ~3 min
6. **Test migrations:** Add a migration locally, push — entrypoint runs `migrate deploy` automatically
7. **Check DB:** `docker compose exec postgres psql -U photoheadshot -d photoheadshotdb -c '\dt'`

---

## Phase 6: Security Hardening (on VPS, one-time)

Each tool has a different job — they complement each other:
- **systemd** = service manager. Docker already uses it via `restart: unless-stopped`
- **UFW** = firewall. Blocks all ports except 80/443. **Port 22 NOT exposed** — SSH only via Tailscale
- **Tailscale** = replaces Fail2ban. SSH only accessible via private WireGuard VPN. No brute-force possible.

### 6.1 Firewall (UFW) — No SSH port exposed!

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 80/tcp     # HTTP (Nginx)
sudo ufw allow 443/tcp    # HTTPS (Nginx)
# NOTE: Port 22 is NOT allowed — SSH only via Tailscale
sudo ufw allow in on tailscale0  # Allow all traffic on Tailscale interface
sudo ufw enable
sudo ufw status
```

### 6.2 SSH Hardening

```bash
# Create non-root deploy user
sudo adduser deploy
sudo usermod -aG docker deploy
sudo usermod -aG sudo deploy

# Disable root login + password auth
sudo sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/^#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd
```

SSH is only reachable via Tailscale — no Fail2ban needed.

### 6.3 Auto-cleanup (cron)

```bash
# Clean unused Docker images weekly
echo "0 3 * * 0 docker system prune -af --filter 'until=168h'" | sudo crontab -
```

### 6.4 Docker Security (already handled)

- PostgreSQL has no exposed ports (internal Docker network only)
- App binds to `127.0.0.1:3000` (not public-facing)
- Nginx is the only public-facing service (80/443)
- `env_file` keeps secrets out of compose file
