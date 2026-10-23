# BrandGuard AI — Testing Documentation

BrandGuard AI includes automated test suites covering deterministic compliance logic, review workflow state machines, password security, API endpoints, and workspace isolation.

## 1. Automated Test Suites

### Backend Tests (Pytest)
Located in `backend/tests/`:
- `test_rule_engine.py`:
  - Detection of prohibited phrases with whole-word boundaries.
  - Terminology replacement suggestions with case sensitivity.
  - Required disclaimer checking across specific content categories.
  - Verification that compliant text produces zero false positives.
  - Accurate character offsets (`char_start`, `char_end`).
- `test_review_service.py`:
  - Lifecycle state machine: `draft` ➔ `in_review` ➔ `changes_requested` ➔ `approved`.
  - Non-author submission prevention (HTTP 403).
  - Author self-approval prevention (HTTP 403).
  - Terminal state validation (cannot alter `approved` without new revision).
- `test_security.py`:
  - Argon2id password hashing and constant-time verification.
  - Access and refresh JWT token creation, decoding, and payload validation.
- `test_api_endpoints.py`:
  - User registration, login, and `/auth/me` session recovery.
  - Content draft creation, running deterministic audits, and persisting findings.
  - Cross-workspace isolation (HTTP 403 when User B tries to view or alter User A's workspace submissions or brand guidelines).

### Running Backend Tests
```bash
cd backend
.\.venv\Scripts\pytest.exe -v
```

All 10 test cases pass cleanly with 100% success rate.

---

## 2. Frontend Quality Checks

### TypeScript Compilation
```bash
cd frontend
npm run build
```
Executes `tsc -b` and Vite production bundling, verifying:
- Strict TypeScript typing across all components and API clients.
- Proper tree shaking and code minification.

### ESLint Flat Config
```bash
cd frontend
npm run lint
```
Enforces React Hook rules, strict type checks, and clean imports.

---

## 3. Demonstration Scenarios Verification

### Scenario A: Compliant Content
- Content: `"Our application helps teams organise their daily work and manage project updates. Results may vary based on deployment configuration and network environment."`
- **Result**: 0 violations reported. Clean review summary.

### Scenario B: Explicit Brand-Rule Violation
- Content: `"Our application guarantees results for every customer."`
- **Result**: Highlights `"guarantees results"`, flags high severity violation, provides rationale and suggests `"designed to help achieve measurable results"`. Applying the suggestion updates the draft text in-place.

### Scenario C: Unsupported Factual Claim
- Content: `"Our application guarantees 100% fraud prevention."`
- **Result**: Flags claim with `unsupported_claim` confidence and clearly specifies that no verified fact in the approved knowledge base supports this guarantee. Distinguishes missing evidence from false claims.

### Scenario D: Human Approval Workflow
- Creator creates draft ➔ Runs audit ➔ Submits for review (`in_review`).
- Manager logs in ➔ Inspects queue ➔ Requests changes with comment (`changes_requested`).
- Creator modifies draft ➔ Resubmits (`in_review`).
- Manager reviews updated revision ➔ Approves content (`approved`).
- Attempt by author to self-approve is rejected with HTTP 403.

### Scenario E: AI Unavailable Fallback
- `AI_PROVIDER=none`: Deterministic rules continue executing with full fidelity, returning exact character offsets and replacements without throwing errors.

### Scenario F: Workspace Isolation
- User 2 attempts to query `/api/v1/submissions?workspace_id=ws-1` or `/api/v1/guidelines?workspace_id=ws-1`.
- **Result**: Backend returns HTTP 403 Forbidden. No data leaks.
