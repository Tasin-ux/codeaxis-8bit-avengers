# BrandGuard AI — System Architecture

BrandGuard AI is an AI-assisted brand governance platform that audits marketing content against approved brand voice guidelines, terminology, prohibited phrases, required disclaimers, and auditable product facts prior to publication.

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React 19 SPA (Vite)                      │
│       Tailwind CSS • React Router • Lucide • Recharts       │
└──────────────────────────────┬──────────────────────────────┘
                               │ JSON / REST API
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     FastAPI Application                     │
│  ├── Authentication & RBAC (Argon2id, JWT Bearer)           │
│  ├── Workspace Isolation Layer                              │
│  ├── Resource CRUD (Guidelines, Terms, Phrases, Facts)      │
│  ├── Content Submission & Revision Engine                   │
│  └── Governance Analytics                                   │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────────┐ ┌─────────────────────────────┐
│   Deterministic Rule Engine  │ │  Optional AI Analysis       │
│  ├── Safe Regex Tokenizer    │ │  ├── Google Gemini / OpenAI │
│  ├── Whole-Word Matching     │ │  ├── Tone Consistency       │
│  ├── Disclaimer Checker      │ │  ├── Contextual Analysis    │
│  └── Accurate Char Offsets   │ │  └── Structured Pydantic    │
└──────────────┬───────────────┘ └─────────────┬───────────────┘
               │                               │
               └───────────────┬───────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Audit Findings & State Machine              │
│       Draft ➔ In Review ➔ Changes Requested / Approved      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Persistent Database                      │
│        SQLite (Dev) / PostgreSQL (Production Compatible)    │
│                    Alembic Migrations                       │
└─────────────────────────────────────────────────────────────┘
```

## 2. Core Modules & Responsibilities

### A. Frontend (React + TypeScript + Vite)
- **Feature-Driven Architecture**: Auth, Brand Knowledge, Submissions, Findings, Reviews, Analytics, Settings.
- **State & Session**: `AuthContext` provides authenticated user profile, active workspace selection, and workspace membership role.
- **Findings Dashboard & Editor**: Split-panel workspace where authors edit content, inspect detected rule violations, review factual evidence status, and apply recommended suggestions directly to their draft text.

### B. Backend REST API (FastAPI)
- **Role-Based Access Control (RBAC)**:
  - `Administrator`: Full control over workspace settings, users, and governance rules.
  - `Brand Manager`: Manages guidelines, approved terminology, disclaimers, and reviews/approves content submissions.
  - `Content Creator`: Creates and audits submissions, applies suggestions, and submits drafts for review.
  - `External Contributor`: Restricted to authorized submission creation without accessing internal brand rules.
- **Workspace Isolation**: All queries and mutations verify that the active user belongs to the requested `workspace_id`. Cross-workspace data leakage is strictly prohibited and tested.

### C. Deterministic Rule Engine (`app.services.rule_engine`)
- **Prohibited Phrases**: Identifies exact text matches with configurable whole-word boundaries, case sensitivity, ReDoS-safe patterns, and calculates exact `char_start` and `char_end` offsets.
- **Approved Terminology**: Replaces disallowed terms with brand-preferred terms.
- **Required Disclaimers**: Ensures mandatory disclosures are present for relevant content categories (e.g. `marketing_copy`, `product_description`).
- **Classification & Severity**: Findings are categorized with clear severities (`critical`, `high`, `medium`, `low`, `info`) and confidence markers (`rule_violation`, `potential_mismatch`, `unsupported_claim`).

### D. Optional AI Analysis Service (`app.services.ai_service`)
- **Graceful Degradation**: Operates fully when `AI_PROVIDER=none` or no API key is provided. Deterministic checks continue functioning without interruption.
- **Context Injection**: Provides the LLM with active brand guidelines and verified facts.
- **Factual Traceability**: Distinguishes between claims with approved evidence, contradictory claims, and unverified assertions. Missing evidence is never reported as conclusive proof of falsity.
- **Prompt Injection Defense**: Submitted content is treated as untrusted data wrapped in structured prompts with schema-enforced JSON validation.

### E. Human Review & State Machine (`app.services.review_service`)
- Enforces strict transition rules:
  - `draft` ➔ `in_review` (author only)
  - `in_review` ➔ `approved` (manager/admin only; authors cannot self-approve)
  - `in_review` ➔ `changes_requested` (manager/admin)
  - `changes_requested` ➔ `in_review` (resubmission by author)
  - Terminal state `approved` cannot be altered without creating a new revision.
