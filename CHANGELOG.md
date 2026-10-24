# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] - 2026-10-24

### Added
- Multi-platform bot execution engine for Naukri, LinkedIn, Internshala, and Indeed.
- Admin command center with real-time candidate management and portal rate throttles.
- Real-time application telemetry and Supabase cloud persistence.
- Resume text parsing engine with automatic skills extraction.
- Comprehensive unit test suites for FastAPI endpoints and frontend React components.

### Changed
- Refactored API client with 35-second retry policy for Render cold starts.
- Restored deep navy theme palette with persistent dark mode.
- Improved browser driver resilience with non-blocking threads and timeouts.

### Fixed
- Fixed skeleton loader flashing on window resize.
- Fixed 502 HTML error display on Vercel deployment.
- Fixed profile onboarding status checks.

---

## [1.0.0] - 2026-10-20
- Initial release of Universal Job Auto-Apply Bot with local SQLite tracker and web dashboard.
