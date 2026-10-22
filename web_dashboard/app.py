"""
Universal Job Auto Apply - Web Dashboard Backend
================================================================================
Lightweight local web server providing real-time analytics, one-click bot controls,
live log streaming, and profile management for the Universal Job Auto Apply Bot.
"""

import os
import sys
import json
import logging
import threading
import subprocess
from datetime import datetime
from urllib.parse import urlparse, parse_qs
from http.server import HTTPServer, SimpleHTTPRequestHandler

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, BASE_DIR)

from platforms.tracker_db import get_statistics, get_recent_applications
from dotenv import load_dotenv, set_key

load_dotenv(os.path.join(BASE_DIR, ".env"))

logger = logging.getLogger("WebDashboard")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# Global State for Bot Execution
BOT_STATE = {
    "is_running": False,
    "current_task": "Idle",
    "started_at": None,
    "recent_logs": []
}

MAX_LOGS = 200


def add_log(message: str, level: str = "INFO"):
    timestamp = datetime.now().strftime("%H:%M:%S")
    entry = {"time": timestamp, "level": level, "msg": message}
    BOT_STATE["recent_logs"].append(entry)
    if len(BOT_STATE["recent_logs"]) > MAX_LOGS:
        BOT_STATE["recent_logs"].pop(0)


def run_bot_job(task_name: str):
    """Execute bot task asynchronously in a background thread."""
    BOT_STATE["is_running"] = True
    BOT_STATE["current_task"] = task_name
    BOT_STATE["started_at"] = datetime.now().strftime("%H:%M:%S")
    add_log(f"Starting job: {task_name}", "INFO")

    try:
        python_exe = sys.executable
        main_script = os.path.join(BASE_DIR, "Universal_Job_Auto_Apply.py")

        cmd = [python_exe, main_script]
        if task_name == "naukri":
            cmd += ["--platform", "naukri"]
        elif task_name == "internshala":
            cmd += ["--platform", "internshala"]
        elif task_name == "indeed":
            cmd += ["--platform", "indeed"]
        elif task_name == "linkedin":
            cmd += ["--platform", "linkedin"]
        elif task_name == "all":
            cmd += ["--platform", "all"]
        elif task_name == "sync_profiles":
            cmd += ["--update-all-profiles"]
        elif task_name == "portals":
            cmd += ["--platform", "portals"]

        add_log(f"Spawning process: {' '.join(cmd)}", "INFO")
        process = subprocess.Popen(
            cmd,
            cwd=BASE_DIR,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            encoding="utf-8",
            errors="replace"
        )

        for line in process.stdout:
            clean_line = line.strip()
            if clean_line:
                add_log(clean_line, "INFO")

        process.wait()
        add_log(f"Job completed: {task_name} (Exit Code: {process.returncode})", "SUCCESS")
    except Exception as e:
        add_log(f"Job failed: {e}", "ERROR")
    finally:
        BOT_STATE["is_running"] = False
        BOT_STATE["current_task"] = "Idle"


class DashboardHandler(SimpleHTTPRequestHandler):
    """Handles REST API and static dashboard files."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.path.dirname(__file__), **kwargs)

    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/stats":
            stats = get_statistics()
            self._send_json(stats)
            return

        elif path == "/api/applications":
            apps = get_recent_applications(limit=100)
            self._send_json(apps)
            return

        elif path == "/api/status":
            self._send_json(BOT_STATE)
            return

        elif path == "/api/logs":
            self._send_json(BOT_STATE["recent_logs"])
            return

        elif path == "/api/profile":
            p_file = os.path.join(BASE_DIR, "profile_data.json")
            if os.path.exists(p_file):
                with open(p_file, "r", encoding="utf-8") as f:
                    self._send_json(json.load(f))
            else:
                self._send_json({}, 404)
            return

        elif path == "/api/config":
            env_data = {
                "KEYWORDS": os.getenv("KEYWORDS", "Full Stack Developer"),
                "LOCATION": os.getenv("LOCATION", "Pune"),
                "BROWSER": os.getenv("BROWSER", "auto"),
                "NAUKRI_EMAIL": os.getenv("NAUKRI_EMAIL", ""),
                "INTERNSHALA_EMAIL": os.getenv("INTERNSHALA_EMAIL", ""),
                "INDEED_EMAIL": os.getenv("INDEED_EMAIL", ""),
                "LINKEDIN_EMAIL": os.getenv("LINKEDIN_EMAIL", ""),
                "TELEGRAM_BOT_TOKEN": os.getenv("TELEGRAM_BOT_TOKEN", ""),
                "TELEGRAM_CHAT_ID": os.getenv("TELEGRAM_CHAT_ID", ""),
                "DISCORD_WEBHOOK_URL": os.getenv("DISCORD_WEBHOOK_URL", "")
            }
            self._send_json(env_data)
            return

        # Default static file serving (index.html)
        if path == "/" or path == "":
            self.path = "/index.html"
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode("utf-8") if content_length > 0 else "{}"
        try:
            data = json.loads(body)
        except Exception:
            data = {}

        if path == "/api/run":
            task = data.get("task", "all")
            if BOT_STATE["is_running"]:
                self._send_json({"success": False, "error": "A bot job is already running!"}, 400)
                return

            threading.Thread(target=run_bot_job, args=(task,), daemon=True).start()
            self._send_json({"success": True, "message": f"Job '{task}' started."})
            return

        elif path == "/api/profile":
            p_file = os.path.join(BASE_DIR, "profile_data.json")
            try:
                with open(p_file, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                self._send_json({"success": True, "message": "Profile updated successfully!"})
            except Exception as e:
                self._send_json({"success": False, "error": str(e)}, 500)
            return

        elif path == "/api/config":
            env_file = os.path.join(BASE_DIR, ".env")
            try:
                for k, v in data.items():
                    set_key(env_file, k, str(v))
                    os.environ[k] = str(v)
                self._send_json({"success": True, "message": "Settings saved to .env!"})
            except Exception as e:
                self._send_json({"success": False, "error": str(e)}, 500)
            return

        self._send_json({"error": "Endpoint not found"}, 404)


def start_server(port=5000):
    server_address = ("", port)
    try:
        httpd = HTTPServer(server_address, DashboardHandler)
        logger.info(f"🚀 Universal Bot Dashboard live at: http://localhost:{port}")
        add_log("Dashboard server started on port " + str(port), "INFO")
        httpd.serve_forever()
    except OSError as e:
        if port < 5010:
            logger.info(f"Port {port} busy, trying {port+1}...")
            start_server(port + 1)
        else:
            logger.error(f"Could not bind dashboard server: {e}")


if __name__ == "__main__":
    port = int(os.getenv("DASHBOARD_PORT", 5000))
    start_server(port)
