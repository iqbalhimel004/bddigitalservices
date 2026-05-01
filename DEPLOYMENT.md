# BD Digital Services — Deployment Guide

## Hostinger Node.js Hosting

### Prerequisites
- Node.js 20+
- pnpm 9+
- PostgreSQL database (Hostinger provides one via hPanel)

### Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```
DATABASE_URL=postgresql://user:password@host:5432/dbname
PORT=8080
NODE_ENV=production
ADMIN_USERNAME=your-admin-email@example.com
ADMIN_PASSWORD_HASH=your-bcrypt-hash
ADMIN_SECRET=your-random-secret-key
BASE_PATH=/
```

> **Important:** `ADMIN_PASSWORD_HASH` must be a bcrypt hash, **not** a plain-text password. Generate one with:
> ```bash
> node -e "const b=require('bcryptjs'); console.log(b.hashSync('your-password', 12))"
> ```
> Always change `ADMIN_PASSWORD_HASH` and `ADMIN_SECRET` before going live.

### One-Time Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Run database schema migrations
pnpm --filter @workspace/db run push

# 3. Build the frontend
pnpm --filter @workspace/bd-digital-services run build

# 4. Build the API server
pnpm --filter @workspace/api-server run build
```

### Production Start

```bash
node artifacts/api-server/dist/index.mjs
```

The server automatically:
- Serves the API at `/api/*`
- Serves the React frontend at all other routes (SPA)
- Seeds default categories and products on first startup (if DB is empty)

Or use the root shorthand:

```bash
pnpm start
```

### How It Works

- Frontend (React) is built to `artifacts/bd-digital-services/dist/public/`
- Express serves both the API and the frontend static files from a single Node.js process
- Admin panel at `/admin` — login with `ADMIN_USERNAME` / your password (stored as `ADMIN_PASSWORD_HASH`)

### Admin Panel

- URL: `https://yourdomain.com/admin`
- Credentials: set via `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH` (bcrypt hash) env vars
- **Always set `ADMIN_PASSWORD_HASH` and `ADMIN_SECRET` in production before launch**

### Seeding

Default data (6 categories, 15 products) is seeded automatically at first startup when the tables are empty. To re-seed a fresh database, simply start the server and it will seed.
