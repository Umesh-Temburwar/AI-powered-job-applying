# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

---

## Reporting a Vulnerability

Security of user data, session cookies, and portal credentials is our top priority.

If you discover a security issue or vulnerability:
1. **Do not create a public GitHub issue.**
2. Send an email with vulnerability details, reproduction steps, and potential impact to the project maintainers.
3. We will acknowledge receipt within 48 hours and work on a fix promptly.

---

## Best Practices for Users
- Never commit `.env` or files containing plain passwords or session cookies to Git.
- Always use `.env.example` as a template.
- Utilize Supabase Row Level Security (RLS) on production database tables.
