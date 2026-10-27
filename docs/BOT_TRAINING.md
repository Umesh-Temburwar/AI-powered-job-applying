# 🤖 Universal Job Apply Bot - AI Training & Screening Q&A Engine

## Overview
The **Bot Training & Screening Evaluation Engine** empowers the Universal Auto-Apply Bot with deterministic and heuristic intelligence to auto-fill recruiter questionnaires across **Naukri, Internshala, LinkedIn Easy Apply, and Indeed**.

It eliminates application drop-offs caused by mandatory employer screening questions, salary inputs, notice period disclosures, and technical skill verification forms.

---

## Architecture Diagram

```mermaid
flowchart TD
    A[Recruiter Screening Question] --> B[Domain Synonym Normalizer]
    B --> C[Tech Stack Alias Expander]
    C --> D[Multi-Strategy Matcher]
    
    subgraph Multi-Strategy Matcher
        D1[Exact Canonical Bank Lookup]
        D2[Token Set / Permutation Ratio]
        D3[Levenshtein Fuzzy Matcher]
        D4[Contextual Heuristics Engine]
        D5[Optional Gemini LLM Fallback]
    end
    
    D --> D1
    D --> D2
    D --> D3
    D --> D4
    D --> D5
    
    D1 & D2 & D3 & D4 & D5 --> E[Confidence Scorer]
    E --> F{Confidence >= 0.60?}
    F -- Yes --> G[Contextual Formatter (LPA, numeric, radio)]
    F -- No --> H[Active Learning Registry]
    H --> I[Human Review & Feedback Promoter]
    I --> J[(application_answers.csv & Supabase)]
    G --> K[Form Autocompletion on Portal]
```

---

## Key Modules

| Module | Location | Purpose |
|---|---|---|
| **BotTrainer** | `backend/services/bot_training/engine.py` | Benchmark evaluation, accuracy reporting, latency tracking |
| **Similarity Engine** | `backend/services/bot_training/similarity.py` | Levenshtein distance, token sort ratio, and token set ratio |
| **Domain Synonyms** | `backend/services/bot_training/synonyms.py` | Canonical recruiter phrasing & tech stack normalization |
| **Contextual Formatters** | `backend/services/bot_training/formatters.py` | CTC currency conversion, notice period styles, and radio choices |
| **Confidence Scorer** | `backend/services/bot_training/scoring.py` | Weighted confidence scores and explainable reasoning trails |
| **Learning Registry** | `backend/services/bot_training/learning_registry.py` | Unanswered questions capture for active retraining |
| **ATS Analyzer** | `backend/services/bot_training/ats_analyzer.py` | N-gram skill extraction and weighted resume compatibility |
| **Questionnaire Simulator** | `backend/services/bot_training/questionnaire_simulator.py` | Mock portal screening tests for CI & automation runner |

---

## Domain Question Datasets

Over **100+ vetted screening questions and golden answers** are organized in `backend/services/bot_training/datasets/`:
- `frontend_qa.json` (React.js, Next.js, TypeScript, Tailwind)
- `backend_qa.json` (Node.js, Express.js, FastAPI, asyncio)
- `database_qa.json` (PostgreSQL, Supabase, MongoDB, RLS)
- `devops_qa.json` (Docker, Git, GitHub Actions, Linux)
- `api_design_qa.json` (REST standards, pagination, status codes)
- `testing_qa.json` (Pytest, Jest, TestClient, RTL)
- `state_perf_qa.json` (Redux Toolkit, memoization, lazy loading)
- `security_auth_qa.json` (JWT, bcrypt, CORS, RBAC, OWASP)
- `compensation_qa.json` (CTC, stipend, salary negotiation)
- `notice_period_qa.json` (Immediate availability, 0 days, buyout)
- `relocation_qa.json` (Bangalore, Pune, NCR, hybrid, remote)
- `education_qa.json` (B.Tech, CGPA, graduation year, university)
- `shift_readiness_qa.json` (Rotational shifts, US/UK timezones, passport)
- `behavioral_qa.json` (Teamwork, conflict resolution, deadlines)
- `career_goals_qa.json` (3-5 year roadmap, strengths, improvement)
- `work_auth_qa.json` (Indian citizenship, BGV clearance, no visa sponsorship required)

---

## Training CLI (`train_bot.py`)

Run training tasks directly from terminal:

```bash
# View training stats and answer bank size
python train_bot.py --stats

# Run benchmark evaluation across all domain datasets
python train_bot.py --benchmark

# Synchronize all dataset questions into application_answers.csv
python train_bot.py --sync

# Export training records to JSONL for LLM fine-tuning
python train_bot.py --export-jsonl ./fine_tuning_dataset.jsonl
```

---

## API Endpoints

- `GET /api/v1/training/stats`: Dataset volume, candidate skills, and model health.
- `POST /api/v1/training/evaluate`: Evaluate single question with confidence score and reasoning.
- `POST /api/v1/training/benchmark`: Run regression benchmark against golden test suites.
- `POST /api/v1/training/sync`: Merge all domain datasets into active answer bank.
- `GET /api/v1/training/unanswered`: List captured unseen questions for review.
- `POST /api/v1/training/approve`: Promote approved answers directly into bot memory.
