"""
FastAPI Backend Server for Universal Job Auto Apply
================================================================================
Exposes RESTful endpoints for:
  - Bot Analytics & Application CRM
  - One-click Platform Execution (Naukri, Internshala, Indeed, LinkedIn)
  - Supabase Database Integration
  - Candidate Profile Management
"""

import os
import sys
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Optional
import subprocess

from config import settings

# Include parent directory to reuse platforms modules
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from platforms.tracker_db import get_statistics, get_recent_applications

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": "2.0.0",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/api/v1/stats")
def fetch_stats():
    """Retrieve application metrics and analytics across platforms."""
    try:
        return get_statistics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/applications")
def fetch_applications(limit: int = 100):
    """Retrieve recently applied jobs."""
    try:
        return get_recent_applications(limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def execute_bot_task(platform: str):
    """Run bot subprocess in the background."""
    script_path = os.path.join(BASE_DIR, "Universal_Job_Auto_Apply.py")
    cmd = [sys.executable, script_path, "--platform", platform]
    try:
        subprocess.run(cmd, cwd=BASE_DIR)
    except Exception as e:
        print(f"Error running bot task {platform}: {e}")


@app.post("/api/v1/run-bot/{platform}")
def run_bot(platform: str, background_tasks: BackgroundTasks):
    """Trigger an auto-apply bot run in the background."""
    allowed = ["all", "naukri", "internshala", "indeed", "linkedin", "portals"]
    if platform not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid platform. Allowed: {allowed}")

    background_tasks.add_task(execute_bot_task, platform)
    return {"success": True, "message": f"Bot started in background for platform: {platform}"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
