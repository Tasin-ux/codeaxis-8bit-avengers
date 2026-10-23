# BrandGuard AI

> **AI-Assisted Brand Governance & Content Compliance Platform**  
> Proposed by Hackathon Team **8-Bit Avengers**

BrandGuard AI is a full-stack, enterprise-grade brand governance platform that audits marketing content against approved brand voice guidelines, terminology, prohibited phrases, required disclaimers, and verified product facts prior to publication.

---

## Table of Contents

1. [Key Features](#key-features)
2. [Technology Stack](#technology-stack)
3. [Architecture Overview](#architecture-overview)
4. [User Roles and Permissions](#user-roles-and-permissions)
5. [Prerequisites](#prerequisites)
6. [Installation & Setup](#installation--setup)
7. [Environment Configuration](#environment-configuration)
8. [Database Initialization & Seeding](#database-initialization--seeding)
9. [Starting the Application](#starting-the-application)
10. [Running Automated Tests & Quality Checks](#running-automated-tests--quality-checks)
11. [AI Provider Configuration & Graceful Fallback](#ai-provider-configuration--graceful-fallback)
12. [Demonstration Scenarios](#demonstration-scenarios)
13. [Deployment Guide](#deployment-guide)
14. [Security & Privacy Safeguards](#security--privacy-safeguards)
15. [Known Limitations](#known-limitations)

---

## 1. Key Features

- **Deterministic Rule Engine**: High-performance Python regex engine that scans text with exact character offsets, whole-word boundaries, and case sensitivity settings to detect prohibited phrases and unapproved terminology.
- **Auditable Product Facts Knowledge Base**: Maintains verified claims, SLA promises, certifications, and datasheets. Distinguishes between contradictory claims, supported claims, and unverified assertions.
- **Critical Factual Claim Principle**: Missing evidence does not prove a claim is false. BrandGuard AI flags unsupported claims as requiring human verification without fabricating citations.
- **Interactive Content Review Workspace**: Split-panel interface allowing authors to edit drafts, inspect highlight spans, and apply suggested corrections directly into the content with one click.
- **Review & Approval State Machine**: Formal state machine (`draft` ➔ `in_review` ➔ `changes_requested` / `approved`). Author self-approval is blocked; only authorized Brand Managers or Administrators can approve publications.
- **Immutable Revision History**: Snapshots every draft change with revision numbers and diffs.
- **Governance Analytics**: Real-time KPI dashboard tracking total submissions, violation counts by category and severity, frequently triggered rules, and rules marked unclear.
- **Rule Clarity Feedback Loop**: Allows authors to flag ambiguous or overly strict rules for managerial review.
- **Workspace Isolation**: Strict workspace-level scoping across all database models and API routes to prevent multi-tenant data leakage.

---

## 2. Technology Stack

### Frontend
- **Framework**: React 19, TypeScript
- **Bundler & Tooling**: Vite, Tailwind CSS v4, ESLint
- **Routing**: React Router v7
- **HTTP Client**: Axios with automatic JWT interceptors
- **Icons**: Lucide React
- **Analytics Visualization**: Recharts

### Backend
- **Framework**: Python 3.10+ / 3.14 compatible, FastAPI, Uvicorn
- **Validation**: Pydantic v2 & Pydantic-Settings
- **ORM & Database**: SQLAlchemy 2.0, SQLite (Local Dev/Demo), PostgreSQL (Production)
- **Migrations**: Alembic
- **Security & Authentication**: Argon2id (`argon2-cffi`), Python-Jose (JWT)
- **Testing**: Pytest, Pytest-Asyncio, HTTPX

---

## 3. Architecture Overview

```
React 19 Frontend (SPA)
       │ (JSON REST API / Bearer JWT)
       ▼
FastAPI Backend Application
 ├── Authentication & RBAC (Argon2id, JWT)
 ├── Workspace Scoping & Tenant Isolation
 ├── Brand Knowledge Base CRUD
 ├── Deterministic Rule Engine (Regex, Offsets)
 ├── Optional AI Analysis (Gemini / OpenAI)
 ├── Human Review State Machine
 └── Governance Analytics Engine
       │
       ▼
Persistent Database (SQLite / PostgreSQL)
```

For detailed component documentation, see [docs/architecture.md](docs/architecture.md).

---

## 4. User Roles and Permissions

| Role | Permissions |
| :--- | :--- |
| **Administrator** | Full control over workspace settings, membership roles, brand rules, submissions, and governance analytics. |
| **Brand Manager** | Creates brand guidelines, terminology, phrases, disclaimers, and verified facts. Reviews submissions, requests changes, and approves content. |
| **Content Creator** | Creates and edits drafts, runs audits, applies suggestions, and submits drafts for managerial review. Cannot approve own work. |
| **External Contributor** | Restricted to authorized draft submissions without accessing unrelated confidential brand assets. |

---

## 5. Prerequisites

- **Python**: Version 3.10, 3.11, 3.12, 3.13, or 3.14
- **Node.js**: Version 18+ (Node 20+ recommended)
- **npm**: Version 9+

---

## 6. Installation & Setup

### 1. Clone the repository
```bash
cd "c:\Users\Kamran Hossain\OneDrive\Desktop\BrandGuard"
```

### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt
```

### 3. Frontend Setup
```bash
cd ../frontend

# Install dependencies
npm install
```

---

## 7. Environment Configuration

Create a `.env` file in the project root by copying `.env.example`:

```bash
cp .env.example .env
```

Key environment settings:
```ini
ENVIRONMENT=development
DATABASE_URL=sqlite:///./brandguard.db
SECRET_KEY=dev-secret-change-in-production-never-commit-real-secrets
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Optional AI Analysis (Set to 'none' for local deterministic checking only)
AI_PROVIDER=none
AI_API_KEY=
AI_MODEL=
```

---

## 8. Database Initialization & Seeding

BrandGuard AI includes a database seed script that populates realistic demo accounts, brand voice guidelines, terminology, prohibited phrases, required disclaimers, auditable facts, and sample submissions.

```bash
cd backend
.\.venv\Scripts\python.exe scripts/seed.py
```

### Seed Demo Accounts:
- **Administrator**: `admin@brandguard.ai` / `Demo123!@#`
- **Content Creator**: `creator@brandguard.ai` / `Demo123!@#`

To apply Alembic migrations:
```bash
cd backend
.\.venv\Scripts\alembic.exe upgrade head
```

---

## 9. Starting the Application

### Start the Backend Server
```bash
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```
- API will be accessible at: `http://localhost:8000`
- Swagger Documentation: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

### Start the Frontend Server
In a separate terminal:
```bash
cd frontend
npm run dev
```
- Web Application will be accessible at: `http://localhost:5173`

---

## 10. Running Automated Tests & Quality Checks

### Backend Automated Test Suite (Pytest)
```bash
cd backend
.\.venv\Scripts\pytest.exe -v
```
**Results**: 10 passed tests covering:
- Prohibited phrase detection & offset calculation
- Terminology replacement suggestions
- Required disclaimer verification
- Clean content verification (zero false positives)
- Review lifecycle state machine transitions & self-approval prevention
- Argon2id password hashing and token generation
- Auth login & session recovery
- Workspace isolation and cross-tenant access rejection

### Frontend Production Build Check
```bash
cd frontend
npm run build
```
Executes TypeScript type checking (`tsc -b`) and Vite production bundling.

### Frontend Linter Check
```bash
cd frontend
npm run lint
```
Runs ESLint across all TypeScript and React components.

---

## 11. AI Provider Configuration & Graceful Fallback

BrandGuard AI is architected with a provider-independent AI abstraction:
- When `AI_PROVIDER=none` or when no API key is provided, the application **remains fully operational**. Deterministic checks (prohibited phrases, terminology, disclaimers) execute normally.
- When configured with `AI_PROVIDER=gemini` or `AI_PROVIDER=openai` and a valid `AI_API_KEY`, the application supplements deterministic findings with contextual tone analysis, qualitative style assessments, and factual claim verifications.
- Responses are validated against strict Pydantic schemas. Unverified claims cite lack of supporting evidence rather than making false accusations.

---

## 12. Demonstration Scenarios

### Scenario A: Compliant Content
- **Input**: `"Our application helps teams organise their daily work and manage project updates. Results may vary based on deployment configuration and network environment."`
- **Result**: Zero false positives. Clean review summary.

### Scenario B: Explicit Brand Rule Violation
- **Input**: `"Our application guarantees results for every customer."`
- **Result**: Prohibited phrase `"guarantees results"` flagged as High severity. Suggested correction: `"designed to help achieve measurable results"`. Applying the suggestion updates the editor draft in-place.

### Scenario C: Unsupported Factual Claim
- **Input**: `"Our application guarantees 100% fraud prevention."`
- **Result**: Flagged as `unsupported_claim`. UI explicitly states: *"Unverified — no supporting evidence was found in the approved brand knowledge base."* Missing evidence does not prove the claim false; human verification is requested.

### Scenario D: Human Approval Workflow
1. Creator creates a draft and runs compliance check.
2. Creator submits draft (`in_review`).
3. Author attempts self-approval and is blocked (HTTP 403).
4. Brand Manager inspects review queue and requests changes with comments (`changes_requested`).
5. Creator revises draft and resubmits (`in_review`).
6. Brand Manager approves content (`approved`).
7. Complete revision history and decisions are recorded immutably.

### Scenario E: AI Unavailable Fallback
- Run audit without external AI credentials. Deterministic engine completes with 100% functionality and no crashes.

### Scenario F: Multi-Tenant Workspace Isolation
- User B cannot access User A's workspace submissions, guidelines, or analytics (HTTP 403 Forbidden).

---

## 13. Deployment Guide

See [docs/deployment.md](docs/deployment.md) for full production deployment instructions on Vercel, Render, Docker, and PostgreSQL.

---

## 14. Security & Privacy Safeguards

- **Argon2id Hashing**: Robust, memory-hard password hashing.
- **JWT Authentication**: Short-lived tokens with cryptographically signed payloads.
- **ReDoS Protection**: Pattern length limiting and regex sanitization in the rule engine.
- **Untrusted Input Handling**: Draft text is treated as untrusted data to protect against prompt injection.
- **No Hardcoded Secrets**: All configuration managed via environment variables.

---

## 15. Known Limitations

1. **Rich Text Formatting**: Current MVP focuses on plain text, Markdown, and copy text; full rich WYSIWYG rich text formatting (HTML tables, inline images) is deferred to future enterprise releases.
2. **External File Parsing**: Text can be pasted directly; binary file uploads (.docx/.pdf parsing) are planned for the next roadmap phase.
