# 🚀 Universal Job Auto Apply Bot (2026 All-in-One Edition)
> The Ultimate All-in-One Multi-Platform Automated Job Application & Profile Synchronization Engine for Indian & Global Portals.

![Python](https://img.shields.io/badge/Python-3.11%2B-blue?style=flat-square&logo=python)
![Selenium](https://img.shields.io/badge/Selenium-4.x-green?style=flat-square&logo=selenium)
![Platforms](https://img.shields.io/badge/Platforms-Naukri%20%7C%20Internshala%20%7C%20Indeed%20%7C%20LinkedIn-orange?style=flat-square)
![Status](https://img.shields.io/badge/Status-Active%20%26%20Tested-brightgreen?style=flat-square)

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
- 🧠 **AI Screening Answerer & ATS Matcher**:
  - Auto-answers subjective employer questions ("Why should we hire you?", "Describe your experience with React") using Candidate profile heuristics or optional Gemini Flash API.
  - ATS Keyword Matcher evaluates job descriptions against candidate skills and calculates match compatibility score.
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

## 🔒 Security & Privacy
- Credentials are stored strictly locally in your `.env` file.
- The `.env` file is excluded in `.gitignore` to prevent committing secrets to GitHub.
- Anti-detection browser flags and human-like typing delays prevent bot detection and account suspension.