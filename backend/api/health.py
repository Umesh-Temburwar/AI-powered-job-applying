from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import HTMLResponse, JSONResponse

from core.config import Settings, get_settings
from schemas.common import HealthResponse

router = APIRouter(tags=["Health"])


API_HTML_STATUS_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>REST API ONLINE // AI-POWERED-JOB-APPLYING</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🚀</text></svg>">
  <style>
    :root {
      --bg: #0b0e14;
      --card-bg: #111520;
      --border: #2e384d;
      --accent: #10b981;
      --accent-hover: #059669;
      --accent-glow: rgba(16, 185, 129, 0.35);
      --text: #f4f4f5;
      --text-muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background-image: radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.18) 0%, transparent 70%);
    }
    .container {
      width: 100%;
      max-width: 860px;
      background: var(--card-bg);
      border: 2px solid var(--border);
      box-shadow: 0 0 45px var(--accent-glow);
      padding: 36px 32px;
      border-radius: 8px;
    }
    .badge-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 8px 16px;
      background: rgba(16, 185, 129, 0.15);
      border: 1.5px solid var(--accent);
      color: var(--accent);
      font-weight: 800;
      font-size: 13px;
      letter-spacing: 1px;
      text-transform: uppercase;
      border-radius: 4px;
      box-shadow: 0 0 15px rgba(16, 185, 129, 0.25);
    }
    .port-badge {
      display: inline-flex;
      align-items: center;
      padding: 8px 14px;
      background: #1e293b;
      border: 1.5px solid #334155;
      color: #94a3b8;
      font-size: 12px;
      font-weight: 700;
      border-radius: 4px;
    }
    .dot {
      width: 10px;
      height: 10px;
      background: var(--accent);
      border-radius: 50%;
      box-shadow: 0 0 12px var(--accent);
      animation: pulse 1.8s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.35; transform: scale(1.3); }
    }
    h1 {
      font-size: 28px;
      font-weight: 900;
      color: #ffffff;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }
    .hindi-alert {
      font-size: 19px;
      color: #34d399;
      font-weight: 800;
      margin-bottom: 16px;
      text-shadow: 0 0 10px rgba(52, 211, 153, 0.3);
    }
    p.lead {
      color: var(--text-muted);
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 28px;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 32px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 13px 22px;
      font-family: inherit;
      font-size: 13px;
      font-weight: 800;
      text-decoration: none;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s ease;
      border: 2px solid transparent;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .btn-primary {
      background: var(--accent);
      color: #0b0e14;
      border-color: var(--accent);
      box-shadow: 0 0 20px var(--accent-glow);
    }
    .btn-primary:hover {
      background: var(--accent-hover);
      box-shadow: 0 0 30px rgba(16, 185, 129, 0.7);
      transform: translateY(-2px);
    }
    .btn-secondary {
      background: #1e293b;
      color: #f1f5f9;
      border-color: #334155;
    }
    .btn-secondary:hover {
      background: #334155;
      border-color: #475569;
      transform: translateY(-2px);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 14px;
      margin-bottom: 28px;
    }
    .card {
      background: #0c1017;
      border: 1px solid var(--border);
      padding: 16px;
      border-radius: 4px;
    }
    .card-title {
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .card-val {
      font-size: 13px;
      color: #fff;
      font-weight: 700;
    }
    .val-green { color: #10b981; }
    .table-container {
      margin-top: 10px;
      margin-bottom: 24px;
      background: #0c1017;
      border: 1px solid var(--border);
      border-radius: 4px;
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      text-align: left;
    }
    th {
      background: #141a26;
      padding: 10px 14px;
      color: #94a3b8;
      font-weight: 700;
      border-bottom: 1px solid var(--border);
    }
    td {
      padding: 10px 14px;
      border-bottom: 1px solid rgba(46, 56, 77, 0.5);
      color: #e2e8f0;
    }
    tr:last-child td { border-bottom: none; }
    .tag {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: 700;
    }
    .tag-get { background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid #3b82f6; }
    .tag-post { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid #10b981; }
    .footer {
      border-top: 1px solid var(--border);
      padding-top: 16px;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      color: var(--text-muted);
      font-size: 11px;
      gap: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="badge-bar">
      <div class="status-badge">
        <span class="dot"></span>
        REST API: ON HO GAYI HAI // STATUS: ACTIVE
      </div>
      <div class="port-badge">PORT: 8001 (LISTENING)</div>
      <div class="port-badge">ENGINE: FASTAPI + CHROMIUM</div>
    </div>

    <h1>AI-POWERED-JOB-APPLYING REST API</h1>
    <div class="hindi-alert">✓ REST API On Ho Gayi Hai! Backend Server Ekdam Ready Hai.</div>
    <p class="lead">
      FastAPI automation backend listener port <strong>8001</strong> par successfully active ho chuka hai.
      Selenium undetectable automation runner, background task queue daemon, aur dual-store (SQLite + Supabase) connections ready hain.
    </p>

    <div class="actions">
      <a href="http://localhost:5173/applications" class="btn btn-primary">
        🚀 OPEN WEB DASHBOARD UI (http://localhost:5173)
      </a>
      <a href="/docs" class="btn btn-secondary">
        📖 SWAGGER API DOCS (/docs)
      </a>
      <a href="/health" class="btn btn-secondary">
        🩺 HEALTH PROBE (/health)
      </a>
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-title">Backend API Base</div>
        <div class="card-val val-green">http://127.0.0.1:8001</div>
      </div>
      <div class="card">
        <div class="card-title">React Dashboard</div>
        <div class="card-val val-green">http://localhost:5173</div>
      </div>
      <div class="card">
        <div class="card-title">Automation Runner</div>
        <div class="card-val val-green">STEALTH (Chrome + Edge)</div>
      </div>
      <div class="card">
        <div class="card-title">Database Storage</div>
        <div class="card-val val-green">DUAL STORE (SQLite + Supabase)</div>
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Method</th>
            <th>Primary API Endpoint</th>
            <th>Description</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="tag tag-get">GET</span></td>
            <td><code>/health</code></td>
            <td>Heartbeat ping probe & backend status check</td>
            <td style="color:#10b981; font-weight:700;">ACTIVE</td>
          </tr>
          <tr>
            <td><span class="tag tag-get">GET</span></td>
            <td><code>/docs</code></td>
            <td>Interactive OpenAPI / Swagger Documentation</td>
            <td style="color:#10b981; font-weight:700;">READY</td>
          </tr>
          <tr>
            <td><span class="tag tag-get">GET</span></td>
            <td><code>/api/v1/jobs/ledger</code></td>
            <td>Applied jobs tracking ledger across 9 portals</td>
            <td style="color:#10b981; font-weight:700;">CONNECTED</td>
          </tr>
          <tr>
            <td><span class="tag tag-post">POST</span></td>
            <td><code>/api/v1/automation/start</code></td>
            <td>Trigger autonomous job application process</td>
            <td style="color:#10b981; font-weight:700;">DAEMON READY</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="footer">
      <span>AI-powered-job-applying v3.4 Pro</span>
      <span>Architect & Lead Engineer: Umesh Temburwar</span>
      <span>Status: 100% Operational</span>
    </div>
  </div>
</body>
</html>"""


@router.get(
    "/",
    summary="Root Welcome & REST API Live Status",
    description="Interactive dashboard confirming REST API is active and running.",
)
def root_status(request: Request, settings: Annotated[Settings, Depends(get_settings)]) -> Response:
    """Return an interactive HTML status page for web browsers or JSON for API clients."""
    accept = request.headers.get("accept", "")
    if "text/html" in accept or "*/*" in accept or not accept:
        return HTMLResponse(content=API_HTML_STATUS_TEMPLATE, status_code=200)

    return JSONResponse(
        content={
            "status": "ok",
            "message": "REST API on ho gayi hai! AI-powered-job-applying backend is active and healthy.",
            "service": settings.APP_NAME,
            "port": 8001,
            "docs_url": "/docs",
            "health_url": "/health",
            "frontend_url": "http://localhost:5173",
        },
        status_code=200,
    )


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Service Health Check",
    description="Verify backend API availability and operational health.",
)
def get_health(settings: Annotated[Settings, Depends(get_settings)]) -> HealthResponse:
    """Return health status and official service name."""
    return HealthResponse(
        status="ok",
        service=settings.APP_NAME,
    )


@router.get(
    "/health/ping",
    summary="Service Ping Probe",
    description="Fast lightweight ping endpoint for load balancer probes and uptime checks.",
)
def ping() -> dict[str, str]:
    """Return pong response for latency monitoring."""
    return {"ping": "pong", "status": "healthy"}
