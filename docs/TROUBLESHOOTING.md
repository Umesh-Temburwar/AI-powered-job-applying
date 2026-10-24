# Troubleshooting & Common Issues Guide

This guide covers common issues encountered when running automated job application tasks.

---

## 1. Browser & Driver Issues

### 1.1 "Chrome driver executable not found"
- **Cause**: Selenium or Playwright cannot detect a valid Chrome browser binary in system PATH.
- **Fix**: Run `playwright install chromium` or verify that Google Chrome is installed in standard program files.

### 1.2 "Session timed out / StaleElementReferenceException"
- **Cause**: Portal DOM elements re-rendered asynchronously during submission.
- **Fix**: Increase retry backoff in `platforms/browser_manager.py` and ensure non-blocking thread timeouts are respected.

---

## 2. Platform Specific Issues

### 2.1 Naukri OTP / Captcha Challenge
- **Cause**: Frequent automated logins trigger Naukri's bot defense.
- **Fix**: Use session persistence via saved cookies in `browser_sessions/` to avoid repeated full logins.

### 2.2 LinkedIn Verification Checkpoint
- **Cause**: Rapid job browsing triggers temporary profile checkpoints.
- **Fix**: Enable human-like random jitter delays between 4s and 9s in the runner options.

---

## 3. Backend & Supabase

### 3.1 502 Bad Gateway / Render Cold Starts
- **Cause**: Free tier Render instance spins down after 15 minutes of inactivity.
- **Fix**: The frontend client includes an automatic 35-second exponential retry policy with warm-up indicators.

### 3.2 Supabase RLS "Permission Denied"
- **Cause**: Auth header missing or user token expired.
- **Fix**: Refresh session in frontend or check `.env` Supabase Anon/Service Role key setup.
