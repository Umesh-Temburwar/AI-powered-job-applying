# Multi-Platform Automation Specifications

This document outlines the architecture, automation capabilities, and form handling for each supported job platform.

---

## 1. Naukri (`platforms/naukri_platform.py` & `Naukri-Recommended.py`)
- **Login Flow**: Session cookie validation or credential submission with profile headline touch.
- **Search Logic**: Matches user preferred titles, location, and minimum experience keywords.
- **Application Method**: Direct single-click apply for "Easy Apply" and structured modal handling for screening questions.
- **Throttling**: Maximum 50 applications per hour to preserve account health.

---

## 2. Internshala (`platforms/internshala_platform.py` & `Internshala-UpdateProfile.py`)
- **Login Flow**: Standard email/password or persistent browser user-data-dir.
- **Application Method**: Handles mandatory cover letter generation, availability questions, and assignment submission links.
- **AI Answerer Integration**: Auto-populates reason for applying and relevant past projects.

---

## 3. LinkedIn (`platforms/linkedin_platform.py`)
- **Login Flow**: Cookie-based authentication (`li_at` session cookie).
- **Search Logic**: Filters for "Easy Apply", remote/hybrid tags, and posting recency (<24h).
- **Form Automation**: Multi-step wizard navigation (Phone, Resume choice, Experience dropdowns, radio questions).

---

## 4. Indeed (`platforms/indeed_platform.py`)
- **Application Method**: Indeed Apply modal handling, contact details autofill, and work authorization confirmations.
- **Deduplication**: Job keys hashed and verified against `jobs_tracker.db` prior to navigation.
