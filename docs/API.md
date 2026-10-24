# Universal Job Auto-Apply Bot - REST API Documentation

Base URL: `http://localhost:8000/api`

All authenticated endpoints require an `Authorization: Bearer <supabase_jwt_token>` header.

---

## 1. Health & System
- `GET /health`: Returns service health status, timestamp, and active environment.
- `GET /health/metrics`: System telemetry including worker load and database connectivity.

## 2. Authentication & Candidates
- `GET /api/auth/me`: Fetches profile details, email, and admin status for current user.
- `POST /api/onboarding/profile`: Saves parsed onboarding information (headline, skills, CTC preferences).

## 3. Resume Management
- `POST /api/resumes/upload`: Uploads resume PDF/DOCX to Supabase storage and extracts plain text.
- `GET /api/resumes`: Lists uploaded resumes and active selection.
- `POST /api/resumes/parse`: Runs AI extraction for skills, work history, and contact metadata.

## 4. Application Tracker
- `GET /api/applications`: Retrieves paginated list of job applications with platform filters.
- `POST /api/applications`: Manually registers an applied job.
- `GET /api/applications/export/csv`: Exports complete application history as CSV.

## 5. Automation Tasks & Queue
- `GET /api/tasks`: Retrieves current task queue, running bot processes, and execution logs.
- `POST /api/tasks/start`: Dispatches an auto-apply task for a specified platform (`naukri`, `linkedin`, `internshala`, `indeed`).
- `POST /api/tasks/stop`: Halts a running task runner.

## 6. Admin Command Center
- `GET /api/admin/candidates`: Retrieves all registered candidates and status (Admin only).
- `GET /api/admin/telemetry`: Real-time system performance, portal rate-limits, and error frequency.
- `POST /api/admin/portals/throttle`: Updates portal throttle delay and rate limits.
