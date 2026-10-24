# BrandGuard AI — Deployment Guide

This guide covers deploying BrandGuard AI to production environments.

## 1. Production Architecture Overview

- **Frontend**: Static single-page application built with Vite and React, deployable to Vercel, Netlify, Cloudflare Pages, or AWS S3 + CloudFront.
- **Backend**: Containerized FastAPI ASGI application running with Uvicorn or Gunicorn behind a reverse proxy (e.g., Render, Railway, Google Cloud Run, AWS ECS).
- **Database**: Managed PostgreSQL database (e.g., Supabase, Neon, AWS RDS, Render Postgres).

---

## 2. Environment Variables Configuration

Copy `.env.example` to `.env` on your deployment target and configure:

```bash
# Environment Mode
ENVIRONMENT=production

# Production Database
DATABASE_URL=postgresql://brandguard_user:password@db-host:5432/brandguard_prod

# Authentication Secrets
# Generate via: openssl rand -hex 32
SECRET_KEY=generate-a-strong-random-hex-string-for-production
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS Allowed Origins (frontend domain)
CORS_ORIGINS=https://brandguard.example.com

# Optional AI Analysis Integration
AI_PROVIDER=gemini # or openai / none
AI_API_KEY=your-api-key-here
AI_MODEL=gemini-2.0-flash

# Email OTP delivery (Brevo API uses port 443 – works on Render free tier,
# where outbound SMTP ports 25/465/587 are blocked)
# Sender must be verified in Brevo (Senders & IP -> Senders -> verify email)
EMAIL_FROM=BrandGuard <verified-sender@example.com>
BREVO_API_KEY=your-brevo-api-key
```

---

## 3. Database Migrations (Alembic)

Run database migrations before starting the application:

```bash
cd backend
alembic upgrade head
```

To seed initial demonstration data or brand guidelines into a staging database:
```bash
python scripts/seed.py
```

---

## 4. Backend Deployment (Docker / Cloud Run / Render)

### Dockerfile (Backend)
```dockerfile
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    DISABLE_SQLALCHEMY_CEXT=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Health Check Endpoint
The backend exposes a lightweight health check at:
`GET /health`
Returns:
```json
{
  "status": "healthy",
  "service": "BrandGuard AI",
  "version": "1.0.0",
  "ai_enabled": false
}
```

---

## 5. Frontend Deployment (Vercel / Netlify / Static Host)

1. Set the build environment variable:
   ```bash
   VITE_API_URL=https://api.brandguard.example.com/api/v1
   ```
2. Build command:
   ```bash
   npm run build
   ```
3. Output directory:
   ```
   dist
   ```
4. Configure Single-Page Application (SPA) rewrite rules so all routes point to `index.html`.
