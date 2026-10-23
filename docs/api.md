# BrandGuard AI — REST API Documentation

All API endpoints are prefixed with `/api/v1`. Interactive OpenAPI Swagger documentation is available at `http://localhost:8000/docs` and ReDoc at `http://localhost:8000/redoc`.

## Authentication

### `POST /api/v1/auth/register`
Creates a new user account.
```json
{
  "email": "user@example.com",
  "username": "user",
  "full_name": "User Name",
  "password": "Password123!"
}
```

### `POST /api/v1/auth/login`
Authenticates user using email/username and password. Returns short-lived JWT access token and refresh token.
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

### `GET /api/v1/auth/me`
Returns currently authenticated user profile. Requires Bearer token header.

---

## Workspaces

### `GET /api/v1/workspaces`
Lists workspaces the authenticated user belongs to.

### `POST /api/v1/workspaces`
Creates a new workspace and sets the caller as workspace `admin`.

### `GET /api/v1/workspaces/{workspace_id}/members`
Lists all members and their roles within the workspace.

### `POST /api/v1/workspaces/{workspace_id}/members`
Adds a user to the workspace with specified role (`admin`, `manager`, `creator`, `external`).

---

## Brand Knowledge Base

### Guidelines
- `GET /api/v1/guidelines?workspace_id={id}`
- `POST /api/v1/guidelines`
- `PATCH /api/v1/guidelines/{id}`
- `DELETE /api/v1/guidelines/{id}`

### Terminology
- `GET /api/v1/terminology?workspace_id={id}`
- `POST /api/v1/terminology`
- `PATCH /api/v1/terminology/{id}`
- `DELETE /api/v1/terminology/{id}`

### Prohibited Phrases
- `GET /api/v1/prohibited-phrases?workspace_id={id}`
- `POST /api/v1/prohibited-phrases`
- `PATCH /api/v1/prohibited-phrases/{id}`
- `DELETE /api/v1/prohibited-phrases/{id}`

### Required Disclaimers
- `GET /api/v1/disclaimers?workspace_id={id}`
- `POST /api/v1/disclaimers`
- `PATCH /api/v1/disclaimers/{id}`
- `DELETE /api/v1/disclaimers/{id}`

### Approved Product Facts
- `GET /api/v1/facts?workspace_id={id}`
- `POST /api/v1/facts`
- `PATCH /api/v1/facts/{id}`
- `DELETE /api/v1/facts/{id}`

---

## Submissions & Review Workflow

### `GET /api/v1/submissions?workspace_id={id}&status={status}`
Lists submissions filtered by workspace, brand, author, and status.

### `POST /api/v1/submissions`
Creates a new content draft and initializes Revision #1.

### `GET /api/v1/submissions/{id}`
Retrieves draft details.

### `PATCH /api/v1/submissions/{id}`
Updates draft title, category, or content. Increments revision number if content changed.

### `POST /api/v1/submissions/{id}/review`
Executes deterministic rule matching and optional AI analysis. Returns findings with exact offsets.

### `POST /api/v1/submissions/{id}/submit`
Transitions submission from `draft` or `changes_requested` to `in_review`.

### `POST /api/v1/submissions/{id}/approve`
Manager or Admin approves the submission. Self-approval by authors is rejected with HTTP 403.

### `POST /api/v1/submissions/{id}/request-changes`
Manager or Admin requests changes on the submission.

---

## Governance Analytics

### `GET /api/v1/analytics/overview?workspace_id={id}`
Returns total submission counts by status and overall findings counts.

### `GET /api/v1/analytics/findings?workspace_id={id}`
Returns violation counts broken down by category and severity.

### `GET /api/v1/analytics/rules?workspace_id={id}`
Returns top 10 most frequently triggered brand governance rules.

### `POST /api/v1/analytics/findings/{id}/flag-unclear`
Records user feedback on ambiguous, overly strict, or inaccurate rules.
