<div align="center">

# 🛡️ BrandGuard AI

**AI-assisted brand governance & content compliance platform**

Audit every piece of marketing copy against your brand voice, terminology,
prohibited phrases, legal disclaimers, and verified product facts — before it ships.

[![Live Demo](https://img.shields.io/badge/Live_Demo-brandguard--frontend.vercel.app-0d9488?style=for-the-badge&logo=vercel&logoColor=white)](https://brandguard-frontend.vercel.app)
[![API Docs](https://img.shields.io/badge/API-Docs_on_Render-1c1917?style=for-the-badge&logo=fastapi&logoColor=teal)](https://brandguard-api.onrender.com/docs)
[![React](https://img.shields.io/badge/React_19-20232a?style=for-the-badge&logo=react&logoColor=61dafb)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-0f172a?style=for-the-badge&logo=tailwindcss&logoColor=38bdf8)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org)

**▶ Live app: [brandguard-frontend.vercel.app](https://brandguard-frontend.vercel.app) · API health: [/health](https://brandguard-api.onrender.com/health)**

</div>

---

## ✨ Highlights

| | |
| :--- | :--- |
| ⚡ **Deterministic rule engine** | Python regex engine with exact character offsets, whole-word boundaries, and case-sensitivity controls — no false positives, no guesswork. |
| 📚 **Auditable fact base** | Verified claims, SLAs, certifications, and datasheets. Distinguishes *contradictory*, *supported*, and *unverified* assertions. |
| 🔍 **Honest AI fallback** | Missing evidence never proves a claim false — unsupported claims are flagged for human verification instead of fabricated citations. |
| ✍️ **Split-panel review workspace** | Edit drafts, inspect highlighted violations, and apply suggested fixes in one click. |
| 🚦 **Approval state machine** | `draft → in_review → changes_requested / approved`, with author self-approval blocked by design. |
| 🧾 **Immutable revisions** | Every save is snapshotted with revision numbers and diffs. |
| 📊 **Governance analytics** | Live KPIs: violations by category & severity, most-triggered rules, rules marked unclear. |
| 🏢 **Multi-tenant workspaces** | Strict workspace scoping on every model and route — zero cross-tenant leakage. |
| 🔐 **Email OTP sign-up** | Registration is verified via 6-digit email codes (Brevo). |

---

## 🧪 Try it live

The app is deployed end-to-end — no setup needed:

1. Open **[brandguard-frontend.vercel.app](https://brandguard-frontend.vercel.app)**
2. Sign in with a demo account:

| Role | Email | Password |
| :--- | :--- | :--- |
| 👑 Administrator | `admin@brandguard.ai` | `Demo123!@#` |
| ✍️ Content Creator | `creator@brandguard.ai` | `Demo123!@#` |

> **Note on sign-ups:** new accounts must verify a 6-digit email code. Locally,
> configure SMTP (Gmail app password — see `.env.example`). On Render's free tier
> outbound SMTP is blocked, so set `BREVO_API_KEY` instead (free Brevo account,
> Gmail verified as sender — no domain needed). With no provider configured, codes
> only go to the dev outbox/console; Resend test mode (`onboarding@resend.dev`)
> only delivers to the workspace owner's inbox.

---

## 🛠 Tech stack

**Frontend** — React 19 · TypeScript · Vite · Tailwind CSS v4 · React Router v7 · Axios (JWT interceptors) · Recharts · Lucide icons

**Backend** — Python 3.10+ · FastAPI · Uvicorn · Pydantic v2 · SQLAlchemy 2.0 · Alembic · Argon2id · python-jose (JWT) · Pytest

**Infra** — PostgreSQL (Render) · Backend on Render · Frontend on Vercel · Brevo (OTP email)

---

## 🏗 Architecture

```
React 19 SPA  ──JSON REST / Bearer JWT──▶  FastAPI
                                            ├── Auth & RBAC (Argon2id + JWT + OTP)
                                            ├── Workspace scoping & tenant isolation
                                            ├── Brand knowledge base CRUD
                                            ├── Deterministic rule engine (regex offsets)
                                            ├── Optional AI analysis (Gemini / OpenAI)
                                            ├── Human review state machine
                                            └── Governance analytics engine
                                                    │
                                                    ▼
                                        SQLite (dev) / PostgreSQL (prod)
```

See [docs/architecture.md](docs/architecture.md) for detailed component documentation.

---

## 👥 Roles & permissions

| Role | Permissions |
| :--- | :--- |
| **Administrator** | Full control: workspace settings, membership, brand rules, submissions, analytics. |
| **Brand Manager** | Manages guidelines, terminology, phrases, disclaimers, facts. Reviews and approves content. |
| **Content Creator** | Creates drafts, runs audits, applies suggestions, submits for review. **Cannot approve own work.** |
| **External Contributor** | Restricted draft submissions only. |

---

## 🚀 Getting started

### Prerequisites

- **Python** 3.10+
- **Node.js** 18+ (20+ recommended) and **npm** 9+

### 1. Clone

```bash
git clone https://github.com/Tasin-ux/codeaxis-8bit-avengers.git
cd codeaxis-8bit-avengers
```

### 2. Backend

```bash
cd backend
python -m venv .venv

# Windows
.\.venv\Scripts\Activate.ps1
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

### 3. Frontend

```bash
cd ../frontend
npm install
```

### 4. Environment

```bash
cp .env.example .env
```

```ini
ENVIRONMENT=development
DATABASE_URL=sqlite:///./brandguard.db
SECRET_KEY=dev-secret-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Optional — set to 'none' for deterministic-only checking
AI_PROVIDER=none
AI_API_KEY=
AI_MODEL=
```

### 5. Seed demo data

Populates demo accounts, brand guidelines, terminology, prohibited phrases,
disclaimers, verified facts, and sample submissions:

```bash
cd backend
.\.venv\Scripts\python.exe scripts/seed.py        # Windows
# .venv/bin/python scripts/seed.py                # macOS / Linux
```

Apply migrations instead with:

```bash
.\.venv\Scripts\alembic.exe upgrade head
```

### 6. Run

**Backend** (terminal 1):

```bash
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

- API: http://localhost:8000 · Swagger: http://localhost:8000/docs · Health: http://localhost:8000/health

**Frontend** (terminal 2):

```bash
cd frontend
npm run dev
```

- App: http://localhost:5173

---

## ✅ Tests & quality checks

```bash
cd backend
.\.venv\Scripts\pytest.exe -v
```

10 passing tests covering prohibited-phrase detection & offsets, terminology
suggestions, disclaimer verification, zero-false-positive clean content,
review state-machine transitions, self-approval prevention, Argon2id hashing,
auth login & session recovery, and cross-tenant access rejection.

```bash
cd frontend
npm run build   # tsc type-check + Vite production bundle
npm run lint    # ESLint
```

---

## 🤖 AI provider configuration

BrandGuard works fully without any AI credentials:

- `AI_PROVIDER=none` (or no key) → deterministic engine runs 100% of checks, no crashes.
- `AI_PROVIDER=gemini` or `openai` with a valid `AI_API_KEY` → adds contextual tone analysis,
  qualitative style assessments, and factual claim verification on top of deterministic findings.
- All AI responses are validated against strict Pydantic schemas; unverified claims cite
  missing evidence rather than making false accusations.

---

## 🎬 Demo scenarios

- **A — Clean content**: compliant copy audits with zero false positives.
- **B — Rule violation**: *"…guarantees results…"* → High-severity flag with one-click suggested fix.
- **C — Unsupported claim**: *"…guarantees 100% fraud prevention."* → flagged `unsupported_claim`, human verification requested — never a fabricated citation.
- **D — Approval workflow**: creator submits → manager requests changes → creator revises → manager approves. Self-approval returns HTTP 403.
- **E — AI offline**: audits complete on the deterministic engine alone.
- **F — Tenant isolation**: cross-workspace reads return HTTP 403.

---

## 🔒 Security

- **Argon2id** password hashing · **JWT** auth with short-lived tokens · **Email OTP** verification
- **ReDoS protection** via pattern length limits and regex sanitization
- Draft text treated as untrusted data (prompt-injection hardening)
- No hardcoded secrets — configuration via environment variables only

---

## 🌐 Deployment

The production stack runs on free tiers and is fully wired:

| Piece | Platform | URL |
| :--- | :--- | :--- |
| Frontend | Vercel | https://brandguard-frontend.vercel.app |
| Backend API | Render | https://brandguard-api.onrender.com |
| PostgreSQL | Render Postgres | internal connection string |

Full deployment instructions: [docs/deployment.md](docs/deployment.md).

---

## 📌 Known limitations

1. **Rich text** — MVP targets plain text and Markdown; full WYSIWYG (HTML tables, inline images) is on the roadmap.
2. **File uploads** — binary parsing (.docx/.pdf) is planned for the next release.

---

<div align="center">

Built with ❤️ by **8-Bit Avengers**

</div>
