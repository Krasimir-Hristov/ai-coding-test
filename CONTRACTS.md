# Shared API Contract (Contract-First)

All parallel agents build against `src/features/tasks/types.ts` committed on `main`.

## Endpoints (Owned by Backend)
- `GET /api/tasks` -> `ApiResponse<Task[]>`
- `POST /api/tasks` -> body: `CreateTaskInput` -> `ApiResponse<Task>`
- `PATCH /api/tasks/[id]` -> body: `UpdateTaskInput` -> `ApiResponse<Task>`

## Integration & Merge Order (Controlled by Supervisor)
1. Backend commits to `feat/backend` -> Supervisor reviews & merges into `main`.
2. Frontend runs `git rebase main` inside `.worktrees/frontend` (resolving any conflicts itself) -> Supervisor reviews & merges into `main`.
3. Unit Tester runs `git rebase main` inside `.worktrees/tester`, executes tests against merged code, and reports results to Supervisor before merging `test/unit` into `main`.
