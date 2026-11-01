# 🚀 Universal Job Auto Apply Bot (2026 All-in-One Edition)
> The Ultimate All-in-One Multi-Platform Automated Job Application & Profile Synchronization Engine for Indian & Global Portals.

![Python](https://img.shields.io/badge/Python-3.11%2B-blue?style=flat-square&logo=python)
![Selenium](https://img.shields.io/badge/Selenium-4.x-green?style=flat-square&logo=selenium)
![Platforms](https://img.shields.io/badge/Platforms-Naukri%20%7C%20Internshala%20%7C%20Indeed%20%7C%20LinkedIn-orange?style=flat-square)
![Status](https://img.shields.io/badge/Status-Active%20%26%20Tested-brightgreen?style=flat-square)
![Tests](https://img.shields.io/badge/Tests-Passing-brightgreen?style=flat-square)

[Architecture](docs/ARCHITECTURE.md) • [REST API](docs/API.md) • [Development](docs/DEVELOPMENT.md) • [Troubleshooting](docs/TROUBLESHOOTING.md) • [Platforms](docs/PLATFORMS.md) • [Deployment](docs/DEPLOYMENT.md) • [Contributing](CONTRIBUTING.md) • [Changelog](CHANGELOG.md)

---


## 📋 Highlights & Key Capabilities

- 🌐 **All-in-One Platform Auto-Apply**:
  - **Naukri.com**: Keyword search parallel multi-tab apply, recommended jobs auto-apply, and daily profile freshness updater.
  - **Internshala.com**: Automated applications for jobs & internships with customized cover notes, plus automated resume/project updater.
  - **Indeed.com**: Automated pagination search and application submission for "Easily Apply" jobs.
  - **LinkedIn.com**: Automated "Easy Apply" bot with resume PDF upload and questionnaire filling.
  - **Multi-Portal Engine**: Extended engine for Glassdoor, Shine, Foundit, TimesJobs, and Wellfound.
- 🎯 **Centralized Profile Knowledge Base**:
  - [`profile_data.json`](profile_data.json): Single master profile with skills, headline, summary, education, and projects (EdTech Learning Platform, Inventory Management, ByteFest).
  - [`application_answers.csv`](application_answers.csv): 50+ pre-filled Q&A pairs for auto-answering application questions (notice period, CTC, experience, relocation, tech stack).
  - [`Umesh-Temburwar-OCT.pdf`](Umesh-Temburwar-OCT.pdf): Master resume automatically attached to job applications.
- 🖥️ **Universal Multi-Browser Engine**:
  - Auto-detects Windows default browser (**Microsoft Edge**, **Google Chrome**, **Brave**, **Firefox**).
- 🖥️ **Modern Web UI Dashboard**:
  - Full-featured dark-mode Web Dashboard (`http://localhost:5000`) with live KPI metrics, real-time log terminal feed, application search/filter CRM table, and in-browser profile editor.
- 🧠 **AI Screening Answerer, Training Engine & ATS Matcher**:
  - Auto-answers subjective and technical employer questions with fuzzy string matching, Levenshtein ratio, token-set permutations, and domain synonym resolution.
  - 100+ pre-trained domain screening datasets across Frontend, Backend, Database, DevOps, API Design, Compensation, Notice Period, and Legal Authorization.
  - Active learning registry (`unanswered_questions.json`) captures novel recruiter queries and auto-promotes approved answers.
  - Benchmark evaluation CLI ([`train_bot.py`](train_bot.py)) with regression detection and fine-tuning JSONL dataset exporter.
  - Comprehensive documentation: [`docs/BOT_TRAINING.md`](docs/BOT_TRAINING.md).
- 💾 **SQLite Application Tracker & CRM**:
  - Persistent `jobs_tracker.db` database tracks every application and prevents duplicate submissions across all platforms.
- 🔔 **Instant Smartphone Push Alerts**:
  - Non-blocking real-time Telegram Bot & Discord Webhook alerts on every successful application.
- 🛡️ **Advanced Human Emulation & Anti-Detection**:
  - Random human typing delays, smooth page scrolling, randomized cooldown intervals, and webdriver flag evasion.
- ⚡ **1-Click Launch**: Double-click [`run.bat`](run.bat), run the Web UI with `py Universal_Job_Auto_Apply.py --gui`, or use the interactive CLI.

---

## 📁 Clean Project Structure

```
Universal-Job-Auto-Apply/
│
├── Universal_Job_Auto_Apply.py       # 🚀 Master All-in-One CLI & Interactive Launcher
├── universal_bot.py                 # Convenience redirect alias to Universal_Job_Auto_Apply.py
├── run.bat                          # 1-Click Windows Batch Launcher
│
├── platforms/                       # 🌐 Core Platform Modules
│   ├── __init__.py
│   ├── browser_manager.py           # Multi-browser engine (Edge, Chrome, Brave, Firefox)
│   ├── naukri_platform.py           # Naukri automation module
│   ├── internshala_platform.py      # Internshala automation module
│   ├── indeed_platform.py           # Indeed easily apply module
│   ├── linkedin_platform.py         # LinkedIn easy apply runner
│   ├── jobbot_engine.py             # 9-Portal extended apply engine
│   └── linkedin/                    # LinkedIn Easy Apply core & configs
│       ├── easyapplybot.py
│       ├── config.yaml
│       ├── qa.csv
│       └── out.csv
│
├── Naukri-Edge.py                   # Standalone Naukri Keyword Multi-Tab Apply
├── Naukri-Recommended.py            # Standalone Naukri Recommended Jobs Apply
├── Naukri-UpdateProfile.py          # Standalone Naukri Profile Freshness & Skills Updater
├── Internshala-UpdateProfile.py     # Standalone Internshala Resume & Projects Updater
│
├── profile_data.json                # Master Candidate Profile (Skills, Summary, Projects)
├── application_answers.csv          # 50+ Auto-Fill Question & Answer Database
├── resume.ini                       # Internshala resume formatted config
├── Umesh-Temburwar-OCT.pdf          # Candidate PDF Resume
│
├── universal_applied_jobs.csv       # Consolidated Master Applied Jobs Tracker
├── naukriapplied.csv                # Naukri specific log
├── internshala_applied.csv          # Internshala specific log
│
├── .env                             # Private credentials & settings (gitignored)
├── .env.example                     # Example configuration template
├── requirements.txt                 # Python dependencies
└── README.md                        # Documentation
```

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```powershell
py -m pip install -r requirements.txt
```

### 2. Configure Credentials (`.env`)
Create or edit `.env` with your logins and preferences:
```ini
NAUKRI_EMAIL=your_email@gmail.com
NAUKRI_PASSWORD=your_password

INTERNSHALA_EMAIL=your_email@gmail.com
INTERNSHALA_PASSWORD=your_password

INDEED_EMAIL=your_email@gmail.com
INDEED_PASSWORD=your_password

LINKEDIN_EMAIL=your_email@gmail.com
LINKEDIN_PASSWORD=your_password

KEYWORDS=Full Stack Developer, React.js Developer, Node.js Developer, Web Developer, Software Engineer
LOCATION=pune
BROWSER=auto
```

### 3. Launch the Bot
Simply run:
```powershell
py Universal_Job_Auto_Apply.py
```
*(Or double-click `run.bat`)*

You will see the interactive dashboard:
```
================================================================================
           UNIVERSAL JOB AUTO APPLY BOT - 2026 ALL-IN-ONE EDITION
================================================================================
Supported Platforms:
  [1] Naukri.com      [2] Internshala.com    [3] Indeed.com    [4] LinkedIn.com
================================================================================
Select an option:
  [1] 🚀 Run Core Platforms (Naukri + Internshala + Indeed + LinkedIn)
  [2] 🔵 Naukri Auto-Apply (Keyword Search & Multi-Tab)
  [3] 🟣 Naukri Recommended Jobs Auto-Apply
  [4] ⚡ Naukri Profile Auto-Updater (Headline, Summary, Skills, Freshness Refresh)
  [5] 🌟 Internshala Resume & Profile Auto-Updater (Projects, Skills, Objective)
  [6] 🔷 Internshala Auto-Apply (Jobs & Internships)
  [7] 🔶 Indeed Auto-Apply (Easily Apply Jobs)
  [8] 💼 LinkedIn Easy Apply
  [9] 🌐 9-Portal Multi-Apply (Glassdoor, Shine, Foundit, TimesJobs, Wellfound)
  [10] 📊 View Consolidated Applied Jobs Report
  [0] ❌ Exit
--------------------------------------------------
```

---

## ⚡ Command-Line Shortcuts

Run directly without the menu using flags:

```powershell
# Run all platforms in sequence
py Universal_Job_Auto_Apply.py --platform all

# Run specific platform
py Universal_Job_Auto_Apply.py --platform naukri
py Universal_Job_Auto_Apply.py --platform internshala
py Universal_Job_Auto_Apply.py --platform indeed
py Universal_Job_Auto_Apply.py --platform linkedin
py Universal_Job_Auto_Apply.py --platform portals

# Sync Profiles across platforms
py Universal_Job_Auto_Apply.py --update-naukri-profile
py Universal_Job_Auto_Apply.py --update-internshala-profile
py Universal_Job_Auto_Apply.py --update-all-profiles

# View consolidated application statistics
py Universal_Job_Auto_Apply.py --report
```

---

## 🌐 Phase 4: Modern Web Platform Architecture (React + FastAPI + Supabase)

The Universal Job Apply Bot now includes a multi-user web application powered by **React 19 + TypeScript**, **FastAPI**, and **Supabase (PostgreSQL + Auth + Storage)** with strict Row Level Security (RLS).

### Architecture Highlights
- **Frontend** (`frontend/`): React + Vite + TypeScript + Tailwind CSS v4 + Supabase Auth JS SDK (`@supabase/supabase-js`).
- **Backend API** (`backend/`): FastAPI with unified error envelope (`/api/v1`), CORS isolation, and `Authorization: Bearer <token>` Supabase JWT verification.
- **Database & Storage**: PostgreSQL schema with automatic user provisioning triggers, user-scoped RLS policies, and private resume PDF storage.

### 1. Supabase Setup Instructions
1. Navigate to [Supabase](https://supabase.com) and create or open your project (e.g. `zhazioldgvjwodzjurzy`).
2. Go to **SQL Editor** in your Supabase Dashboard.
3. Run the migrations in `backend/migrations/` in order, or apply [`012_complete_jobbot_supabase_schema.sql`](backend/migrations/012_complete_jobbot_supabase_schema.sql) on a connected project.
   - Creates job-bot tables: `resumes`, `job_preferences`, `automation_tasks`, `applications`, `application_answers`, `platform_connections`, `portal_configs`, `system_audit_logs`, `resume_analyses`.
   - Enables Row Level Security (RLS) on all user tables (`auth.uid() = user_id`).
   - Creates the private `resumes` storage bucket with path-isolated access policies (`resumes/{user_id}/*`).
4. In **Project Settings > API Keys**, retrieve:
   - **Project URL** (`https://<project-ref>.supabase.co`)
   - **anon / public key**
   - **service_role key** (server-side only)

### 2. Environment Configuration
**Frontend** (`frontend/.env`):
```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_API_BASE_URL=http://localhost:8000
```

**Backend** (`backend/.env`):
```env
APP_NAME=Universal Job Apply Bot API
ENVIRONMENT=development
API_V1_PREFIX=/api/v1
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
SUPABASE_JWT_SECRET=<your-jwt-secret>
```

### 3. Local Startup Commands
Run in separate PowerShell terminals:

```powershell
# Terminal 1: FastAPI Backend
cd D:\Projects\Naukri-autoapply-bot-main\backend
.\.venv\Scripts\Activate.ps1
uvicorn main:app --reload --host 127.0.0.1 --port 8000

# Terminal 2: React + Vite Frontend
cd D:\Projects\Naukri-autoapply-bot-main\frontend
npm run dev
```

---

## 🔒 Security & Privacy
- **Zero Token Leakage**: Backend service-role keys are strictly excluded from client builds and Git.
- **Row Level Security (RLS)**: PostgreSQL rejects cross-user data queries at the database engine level.
- **Private Storage Isolation**: Resume PDFs are accessible only by the owning candidate through short-lived signed URLs.
- **Independent Bot Isolation**: The core Selenium bot remains modular and untouched in root.