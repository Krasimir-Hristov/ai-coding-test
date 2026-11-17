# Shared API Contract (Contract-First)

All parallel agents build strictly against `src/features/tasks/types.ts` committed on `main`.

## 1. Data & Validation Rules
- `Task.id`: non-empty string (`crypto.randomUUID()`).
- `Task.title`: required trimmed string, `1..120` characters.
- `Task.status`: `'todo' | 'in_progress' | 'done'` (default `'todo'` on creation).
- `Task.createdAt`: ISO 8601 string.
- **Errors:** Never return raw stack traces or internal file paths. Return `{ ok: false, error: "<user-friendly message>" }`.

## 2. Endpoints (Owned by Backend)

### Phase 1 Endpoints
- **`GET /api/tasks`**
  - Response `200`: `{ ok: true, data: Task[] }`
- **`POST /api/tasks`**
  - Request body (`CreateTaskInput`): `{ title: string }`
  - Response `201`: `{ ok: true, data: Task }`
  - Response `400`: `{ ok: false, error: "Title must be between 1 and 120 characters." }`

### Phase 2 Endpoints
- **`PATCH /api/tasks/[id]`**
  - Request body (`UpdateTaskInput`): `{ title?: string, status?: TaskStatus }`
  - Response `200`: `{ ok: true, data: Task }`
  - Response `404`: `{ ok: false, error: "Task not found." }`
- **`DELETE /api/tasks/[id]`**
  - Response `200`: `{ ok: true, data: { id: string } }`
  - Response `404`: `{ ok: false, error: "Task not found." }`

## 3. Security Boundary
- Every API route must scrub incoming headers using `scrubIncomingHeaders` from `src/proxy.ts`.

## 4. Integration & Merge Order (Controlled by Supervisor)
1. Backend commits to `feat/backend` -> Supervisor reviews & merges into `main`.
2. Frontend runs `git rebase main` inside `.worktrees/frontend` (resolving any conflicts itself) -> Supervisor reviews & merges into `main`.
3. Unit Tester runs `git rebase main` inside `.worktrees/tester`, executes tests against merged code (`npm test`), and reports results to Supervisor before merging `test/unit` into `main`.
