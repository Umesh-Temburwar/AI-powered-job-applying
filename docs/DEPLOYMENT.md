# Deployment Guide: Vercel & Render

The Universal Job Auto-Apply platform is designed for cloud deployment across Render (FastAPI backend + worker) and Vercel (React Vite SPA).

---

## 1. Backend Deployment (Render)

1. Connect your GitHub repository to Render.
2. Select **Web Service** or use the included `render.yaml` blueprint.
3. Configure settings:
   - **Environment**: Python 3.11.9
   - **Root Directory**: `.`
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
4. Environment Variables:
   - `SUPABASE_URL`
   - `SUPABASE_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
   - `CORS_ORIGINS`: Comma-separated list including your Vercel deployment URL.

---

## 2. Frontend Deployment (Vercel)

1. Import the repository into Vercel.
2. Settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Vercel Configuration (`vercel.json`):
   - Proxy rules route `/api/*` to the live Render backend URL (`https://universal-job-apply-bot.onrender.com/api/$1`).
   - SPA catch-all rewrites route non-API paths to `index.html`.
