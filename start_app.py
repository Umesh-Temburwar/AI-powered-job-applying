"""
================================================================================
AI-powered-job-applying - Unified Application Launcher
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
    print("\n🛑 Shutting down AI-powered-job-applying application...")
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


def free_port(port: int) -> None:
    """Safely terminate any lingering process listening on the specified port."""
    try:
        if sys.platform == "win32":
            out = subprocess.check_output(f"netstat -aon | findstr /r /c:\":{port} .*LISTENING\"", shell=True, text=True, stderr=subprocess.DEVNULL)
            for line in out.strip().splitlines():
                parts = line.strip().split()
                if len(parts) >= 5:
                    pid = parts[-1]
                    if pid.isdigit() and int(pid) > 0 and int(pid) != os.getpid():
                        print(f"      [PORT] Freeing port {port} (killing PID {pid})...")
                        subprocess.run(f"taskkill /F /T /PID {pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        pass


def is_backend_ready(port: int = BACKEND_PORT) -> bool:
    try:
        url = f"http://127.0.0.1:{port}/health"
        req = urllib.request.Request(url, headers={"User-Agent": "UniversalBotLauncher/1.0"})
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            return resp.status == 200
    except Exception:
        return False


def ensure_environment() -> None:
    """Ensure essential configuration files and dependencies exist for new users."""
    import shutil
    # 1. Root .env
    root_env = os.path.join(ROOT_DIR, ".env")
    root_env_example = os.path.join(ROOT_DIR, ".env.example")
    if not os.path.exists(root_env) and os.path.exists(root_env_example):
        shutil.copyfile(root_env_example, root_env)
        print("   [SETUP] Created root .env from .env.example")

    # 2. Frontend .env
    frontend_env = os.path.join(FRONTEND_DIR, ".env")
    if not os.path.exists(frontend_env):
        with open(frontend_env, "w", encoding="utf-8") as f:
            f.write(
                "VITE_SUPABASE_URL=https://rwtimhnxghgzkgrdymmq.supabase.co\n"
                "VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_EUzd4legD4ozbD-KEedciw_-OQVyCJc\n"
                "VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3dGltaG54Z2hnemtncmR5bW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2NzE0NjksImV4cCI6MjEwODI0NzQ2OX0.cEeA6EsSxd2egW0V1ipH5tjUn3n-CchWpeze18_Z46w\n"
                "VITE_API_BASE_URL=http://127.0.0.1:8001\n"
            )
        print("   [SETUP] Created frontend .env (http://127.0.0.1:8001)")

    # 3. Data dirs & template
    data_dir = os.path.join(ROOT_DIR, "data")
    os.makedirs(os.path.join(data_dir, "resumes"), exist_ok=True)
    os.makedirs(os.path.join(data_dir, "user_configs"), exist_ok=True)
    p_json = os.path.join(data_dir, "profile_data.json")
    if not os.path.exists(p_json):
        import json
        with open(p_json, "w", encoding="utf-8") as f:
            json.dump({
                "personal": {"firstname": "", "lastname": "", "phone": "", "email": "", "current_location": ""},
                "naukri_headline": "", "profile_summary": "", "key_skills": [],
                "education": [], "experience": [], "projects": [], "certifications": [],
                "resume_name": None, "resume_path": None
            }, f, indent=2)
        print("   [SETUP] Initialized data/profile_data.json template")

    # 4. Frontend node_modules check
    if not os.path.exists(os.path.join(FRONTEND_DIR, "node_modules")):
        print("   [SETUP] Installing frontend packages (npm install)...")
        npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
        subprocess.run([npm_cmd, "install"], cwd=FRONTEND_DIR, check=False)


def main():
    print("=" * 75)
    print("🚀 LAUNCHING AI-POWERED-JOB-APPLYING (2026 EDITION)")
    print("   • Backend:  FastAPI + Automation Runner (http://127.0.0.1:8001)")
    print("   • Frontend: React 18 + Vite UI (http://localhost:5173)")
    print("   • Database: Supabase Cloud (Live Tasks, CRM, Multi-Portal Auth)")
    print("=" * 75)

    ensure_environment()

    venv_py = os.path.join(ROOT_DIR, ".venv", "Scripts", "python.exe")
    py_exe = venv_py if os.path.exists(venv_py) else sys.executable

    # Free any orphaned processes holding backend or frontend ports
    free_port(BACKEND_PORT)
    free_port(FRONTEND_PORT)

    # 1. Start FastAPI Backend Server
    backend_env = os.environ.copy()
    backend_env["PORT"] = str(BACKEND_PORT)
    backend_env["PYTHONPATH"] = f"{BACKEND_DIR}{os.pathsep}{ROOT_DIR}"

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
        "--reload-dir",
        BACKEND_DIR,
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
    print(f"\n[3/3] Opening Web App in browser: http://localhost:{FRONTEND_PORT}/applications")
    time.sleep(1.5)
    webbrowser.open(f"http://localhost:{FRONTEND_PORT}/applications")

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
