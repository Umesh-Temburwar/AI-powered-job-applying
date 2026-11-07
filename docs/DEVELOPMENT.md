# Local Development Guide

## Prerequisites
- **Python**: Version 3.11 or 3.12
- **Node.js**: Version 18+ and npm
- **Google Chrome**: For browser automation runs
- **Supabase Account**: (Optional for full cloud features, SQLite local mode supported)

---

## 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install requirements
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Setup environment variables
cp .env.example .env

# Run FastAPI development server (port 8001 proxied by Vite frontend)
uvicorn main:app --app-dir backend --reload --reload-dir backend --port 8001
```

---

## 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Run Vite dev server
npm run dev
```

The frontend will run at `http://localhost:5173` and automatically proxy `/api` calls to `http://localhost:8000`.

---

## 3. Running Unit Tests

```bash
# Run backend pytest suite
pytest backend/tests/ -v

# Run frontend tests
cd frontend && npm test
```
