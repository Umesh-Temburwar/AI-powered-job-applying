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
| **BotTrainer** | `backend/services/bot_training/engine.py` | Benchmark evaluation, normalized + fuzzy matching, dynamic template hydration |
| **Question Normalizer** | `backend/services/bot_training/normalizer.py` | Strips ATS noise, expands HR abbreviations (`exp`, `np`, `wfo`), handles Hinglish queries |
| **Template Renderer** | `backend/services/bot_training/template_renderer.py` | Dynamically hydrates `{{placeholder}}` templates from the active candidate's resume |
| **Answer Guardrails** | `backend/services/bot_training/answer_guard.py` | Coerces numeric/radio inputs, strips markdown, prevents `{{placeholder}}` leakage |
| **Similarity Engine** | `backend/services/bot_training/similarity.py` | Levenshtein, token set ratio, character n-gram & stopword-weighted matching |
| **Domain Synonyms** | `backend/services/bot_training/synonyms.py` | Canonical recruiter phrasing & expanded tech stack alias dictionary |
| **Profile Trainer** | `backend/services/bot_training/profile_trainer.py` | Synthesizes candidate-specific screening Q&A strictly from active user profile |
| **Dataset Exporter** | `backend/services/bot_training/dataset_exporter.py` | Deduplicated OpenAI & Gemini fine-tuning JSONL + CSV serializer |
| **Confidence Scorer** | `backend/services/bot_training/scoring.py` | Calibrated confidence scores, explainable reasoning, and batch telemetry |
| **Learning Registry** | `backend/services/bot_training/learning_registry.py` | Unanswered questions capture for active retraining |
| **ATS Analyzer** | `backend/services/bot_training/ats_analyzer.py` | N-gram skill extraction and weighted resume compatibility |
| **Questionnaire Simulator** | `backend/services/bot_training/questionnaire_simulator.py` | Mock portal screening tests and multi-user cross-profile isolation verifier |

---

## Domain Question Datasets

Over **220+ vetted screening questions across 49 golden JSON datasets** are organized in `backend/services/bot_training/datasets/`, including candidate-agnostic `{{placeholder}}` templates that dynamically adapt to each user's resume:
- **Core Stack & Engineering:** `frontend_qa.json`, `backend_qa.json`, `database_qa.json`, `devops_qa.json`, `api_design_qa.json`, `testing_qa.json`, `state_perf_qa.json`, `security_auth_qa.json`
- **Cloud, AI & System Design:** `cloud_aws_gcp_qa.json`, `ai_ml_llm_qa.json`, `system_design_qa.json`, `docker_kubernetes_qa.json`, `dsa_algorithms_qa.json`, `graphql_websockets_qa.json`
- **Modern Frameworks & QA:** `nextjs_tailwind_ui_qa.json`, `python_backend_fastapi_django_qa.json`, `java_spring_microservices_qa.json`, `mobile_react_native_flutter_qa.json`, `qa_automation_selenium_playwright_qa.json`
- **Portal-Specific Rapid Screening:** `linkedin_easy_apply_screening_qa.json`, `naukri_chatbot_screening_qa.json`, `indeed_internshala_assessment_qa.json`
- **Candidate Logistics & HR:** `compensation_qa.json`, `notice_period_qa.json`, `relocation_qa.json`, `college_academics_coursework_qa.json`, `shift_readiness_qa.json`, `behavioral_qa.json`, `career_goals_qa.json`, `work_auth_qa.json`

---

## Training CLI (`train_bot.py`)

Run training tasks directly from terminal:

```bash
# View training stats, golden Q&A count, and answer bank size
python train_bot.py --stats

# Validate all 49 golden JSON datasets and template rendering (0 unresolved placeholders)
python train_bot.py --validate-datasets

# Verify strict multi-user isolation across distinct candidate profiles
python train_bot.py --multi-user-check

# Train & ground all screening Q&A strictly on active user's resume
python train_bot.py --train-for-user

# Run benchmark evaluation across all domain datasets
python train_bot.py --benchmark

# Synchronize all hydrated dataset questions into application_answers.csv
python train_bot.py --sync

# Export deduplicated training records to OpenAI or Gemini JSONL for LLM fine-tuning
python train_bot.py --export-jsonl ./fine_tuning_openai.jsonl
python train_bot.py --export-gemini-jsonl ./fine_tuning_gemini.jsonl
```

---

## API Endpoints

- `GET /api/v1/training/stats`: Dataset volume, candidate skills, and model health.
- `GET /api/v1/training/datasets`: Full catalog of all golden JSON domain datasets and template counts.
- `POST /api/v1/training/evaluate`: Evaluate single question with confidence score and reasoning.
- `POST /api/v1/training/benchmark`: Run regression benchmark against golden test suites.
- `POST /api/v1/training/sync`: Hydrate and merge all domain datasets into active answer bank.
- `POST /api/v1/training/train-for-profile`: Train candidate-specific Q&A strictly from a user's profile JSON.
- `GET /api/v1/training/unanswered`: List captured unseen questions for review.
- `POST /api/v1/training/approve`: Promote approved answers directly into bot memory.
