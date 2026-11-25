# Deploying Folkloop Live (Vercel + Temporal Cloud + Neon + Railway / Fly.io)

Folkloop runs as two lightweight cloud pieces sharing **Temporal Cloud** and **PostgreSQL**:

```text
Browser ──► Vercel (Next.js UI + /api/*) ──► Temporal Cloud (Workflows & Timers)
                     │                                ▲
                     ▼                                │ polls folkloop-villagers
            Neon / Supabase (Postgres) ◄── Railway or Fly.io (Always-On Worker)
```

---

## Step 1: PostgreSQL on Neon (or Supabase) — *Free Tier*

1. Create a free database at **[neon.tech](https://neon.tech)** (or **[supabase.com](https://supabase.com)**).
2. Copy the pooled connection string (`DATABASE_URL`, e.g. `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`).
3. Run Folkloop's migration once from your local terminal:

```bash
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require" pnpm run db:migrate
```

*(SSL is automatically enabled for Neon/Supabase URLs or `sslmode=require`.)*

---

## Step 2: Temporal Cloud — *Free Tier*

1. Sign up at **[cloud.temporal.io](https://cloud.temporal.io)** and create a Namespace (e.g. `folkloop`) with **API Key** authentication enabled.
2. Create an **API Key** under **Settings → API Keys** (select the Namespace with read/write permissions) and copy it immediately.
3. Note your three values:
   - `TEMPORAL_ADDRESS` = `<region>.aws.api.temporal.io:7233` (from the Namespace page's **gRPC Endpoint**)
   - `TEMPORAL_NAMESPACE` = `<namespace>.<account-id>`
   - `TEMPORAL_API_KEY` = `<your-api-key>`
   - `TEMPORAL_UI_URL` = `https://cloud.temporal.io`

*(When `TEMPORAL_API_KEY` is set, Folkloop automatically enables TLS and attaches the `temporal-namespace` header for both the Worker and Vercel API routes.)*

---

## Step 3: Always-On Temporal Worker (Railway or Fly.io)

### Option A: Railway (Fastest — Zero CLI)
1. Go to **[railway.com](https://railway.com)** → **New Project → Deploy from GitHub Repo** → select `folkloop`.
2. Railway automatically detects [`railway.json`](../railway.json) and builds [`Dockerfile.worker`](../Dockerfile.worker) (which pre-bundles Bob's workflow and exposes `/health`).
3. Add these environment variables in Railway → **Variables**:
   - `DATABASE_URL`
   - `TEMPORAL_ADDRESS`
   - `TEMPORAL_NAMESPACE`
   - `TEMPORAL_API_KEY`
   - `TEMPORAL_TASK_QUEUE=folkloop-villagers`
   - `SIMULATION_MS_PER_HOUR=30000`
   - `CONTINUE_AS_NEW_AFTER_DAYS=3`
4. Deploy and check the logs for:
   - `Connected to PostgreSQL database`
   - `Connected to Temporal server`
   - `Folkloop Temporal Worker polling for tasks`

### Option B: Fly.io (`flyctl`)
1. Edit `app = "folkloop-worker"` in [`fly.toml`](../fly.toml) to a unique app name.
2. Run:
   ```bash
   fly apps create <your-unique-worker-app-name>
   fly secrets set \
     DATABASE_URL="postgresql://..." \
     TEMPORAL_ADDRESS="<region>.aws.api.temporal.io:7233" \
     TEMPORAL_NAMESPACE="<namespace>.<account-id>" \
     TEMPORAL_API_KEY="<your-api-key>"
   fly deploy
   ```

---

## Step 4: Next.js Frontend + API on Vercel

1. Go to **[vercel.com/new](https://vercel.com/new)** and import your `folkloop` GitHub repository.
2. Add the same environment variables in **Settings → Environment Variables**:
   - `DATABASE_URL`
   - `TEMPORAL_ADDRESS`
   - `TEMPORAL_NAMESPACE`
   - `TEMPORAL_API_KEY`
   - `TEMPORAL_UI_URL=https://cloud.temporal.io`
   - `TEMPORAL_TASK_QUEUE=folkloop-villagers`
   - `SIMULATION_MS_PER_HOUR=30000`
   - `CONTINUE_AS_NEW_AFTER_DAYS=3`
3. Click **Deploy**!

---

## Step 5: Verify It's Live!

1. Open **`https://<your-app>.vercel.app/api/health`** — confirm you see:
   ```json
   { "ok": true, "database": "connected", "temporal": "connected" }
   ```
2. Open **`https://<your-app>.vercel.app`** — Bob's workflow (`villager-bob`) starts automatically on Temporal Cloud, your Railway/Fly Worker executes his activities and saves events to Neon, and Bob comes alive in the Emerald village!
3. Click the **Temporal** tab → **TEMPORAL UI ↗** to inspect Bob live in Temporal Cloud!
