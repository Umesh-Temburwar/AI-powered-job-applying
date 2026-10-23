"""
================================================================================
Universal Job Auto Apply Bot - Unified Application Launcher
================================================================================
Simultaneously starts:
  1. Backend API (FastAPI + Automation Engine) on http://127.0.0.1:8001
  2. Frontend UI (React + Vite + TailwindCSS) on http://localhost:5173
  3. Seamlessly connects to Supabase Database & Auth

Author: Umesh Temburwar
================================================================================
"""

import os
import sys
import time
import signal
import subprocess
import urllib.request
import webbrowser

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")

BACKEND_PORT = 8001
FRONTEND_PORT = 5173

processes = []


def cleanup(signum=None, frame=None):
    print("\n🛑 Shutting down Universal Job Bot application...")
    for p in processes:
        if p.poll() is None:
            try:
                p.terminate()
                p.wait(timeout=3)
            except Exception:
                try:
                    p.kill()
                except Exception:
                    pass
    print("✅ All services stopped. Goodbye!")
    sys.exit(0)


signal.signal(signal.SIGINT, cleanup)
if hasattr(signal, "SIGTERM"):
    signal.signal(signal.SIGTERM, cleanup)


def is_backend_ready(port: int = BACKEND_PORT) -> bool:
    try:
        url = f"http://127.0.0.1:{port}/health"
        req = urllib.request.Request(url, headers={"User-Agent": "UniversalBotLauncher/1.0"})
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            return resp.status == 200
    except Exception:
        return False


def main():
    print("=" * 75)
    print("🚀 LAUNCHING UNIVERSAL JOB AUTO APPLY BOT (2026 EDITION)")
    print("   • Backend:  FastAPI + Automation Runner (http://127.0.0.1:8001)")
    print("   • Frontend: React 18 + Vite UI (http://localhost:5173)")
    print("   • Database: Supabase Cloud (Live Tasks, CRM, Multi-Portal Auth)")
    print("=" * 75)

    py_exe = sys.executable

    # 1. Start FastAPI Backend Server
    backend_env = os.environ.copy()
    backend_env["PORT"] = str(BACKEND_PORT)
    backend_env["PYTHONPATH"] = BACKEND_DIR

    backend_cmd = [
        py_exe,
        "-m",
        "uvicorn",
        "main:app",
        "--app-dir",
        BACKEND_DIR,
        "--host",
        "127.0.0.1",
        "--port",
        str(BACKEND_PORT),
        "--reload",
    ]

    print(f"\n[1/3] Starting Backend API on http://127.0.0.1:{BACKEND_PORT}...")
    backend_proc = subprocess.Popen(
        backend_cmd,
        cwd=ROOT_DIR,
        env=backend_env,
    )
    processes.append(backend_proc)

    # Wait for backend health check
    ready = False
    for attempt in range(15):
        if is_backend_ready():
            ready = True
            break
        time.sleep(0.5)

    if ready:
        print(f"      Backend is READY and healthy on port {BACKEND_PORT}!")
    else:
        print("      Backend started (continuing startup)...")

    # 2. Start Frontend Vite Dev Server
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    frontend_args = [npm_cmd, "run", "dev"]

    print(f"\n[2/3] Starting Frontend Dashboard on http://localhost:{FRONTEND_PORT}...")
    frontend_proc = subprocess.Popen(
        frontend_args,
        cwd=FRONTEND_DIR,
        shell=(sys.platform == "win32"),
    )
    processes.append(frontend_proc)

    # 3. Launch Default Browser
    print(f"\n[3/3] Opening Dashboard in browser: http://localhost:{FRONTEND_PORT}/dashboard")
    time.sleep(1.5)
    webbrowser.open(f"http://localhost:{FRONTEND_PORT}/dashboard")

    print("\n" + "=" * 75)
    print("✨ Both Frontend & Backend are actively running!")
    print(f"👉 Web Dashboard:  http://localhost:{FRONTEND_PORT}")
    print(f"👉 API Docs:       http://127.0.0.1:{BACKEND_PORT}/docs")
    print("👉 Press Ctrl+C in this terminal anytime to stop both servers.")
    print("=" * 75 + "\n")

    try:
        while True:
            time.sleep(1)
            # Check if any process terminated unexpectedly
            if backend_proc.poll() is not None:
                print(f"⚠️ Backend process exited with code {backend_proc.returncode}")
                break
            if frontend_proc.poll() is not None:
                print(f"⚠️ Frontend process exited with code {frontend_proc.returncode}")
                break
    except KeyboardInterrupt:
        pass
    finally:
        cleanup()


if __name__ == "__main__":
    main()
