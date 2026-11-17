# Educational Multi-Agent Roadmap (TaskFlow)

We build **TaskFlow**, a small educational **Task Tracker**, step by step.
Two independent agents build **Backend** and **Frontend** in parallel, a **Unit Tester** validates the integrated code, and the **Supervisor** controls merges on `main`.

> **Golden Rule:** Never start Phase N+1 until the Supervisor merges Phase N into `main` and all worktrees sync with `main`.

---

## Phase 0 — Foundation & Shared Contract (`main` — Supervisor)
- **Goal:** Establish architecture, strict file ownership, TypeScript contracts, and shared dependencies *before* parallel agents write code.
- **Files owned by Supervisor:** `AGENTS.md`, `CONTRACTS.md`, `ROADMAP.md`, `src/features/tasks/types.ts`, `src/proxy.ts`, `package.json`, `tsconfig.json`.
- **Gate:** Supervisor confirms tech stack skeleton (Next.js + Tailwind v4) on `main` and syncs `.worktrees/*`.

---

## Phase 1 — Create & List Tasks (Step 1: Parallel)

### 1A. Backend Agent (`.worktrees/backend` | branch `feat/backend`)
- **Allowed paths:** `src/features/tasks/dal/`, `src/app/api/tasks/`
- **Tasks:**
  1. Implement `src/features/tasks/dal/task-store.ts` using JSON storage (`data/tasks.json`) with `listTasks()` and `createTask(input: CreateTaskInput)`.
  2. Wrap all file I/O in `try/catch`; generate UUID/unique IDs and ISO timestamps; validate `title` (trimmed, 1–120 chars).
  3. Implement `src/app/api/tasks/route.ts` with `GET` and `POST`, calling `scrubIncomingHeaders(request.headers)` from `@/proxy`, returning `ApiResponse<Task[]>` / `ApiResponse<Task>` with safe error messages.
  4. Commit changes to `feat/backend`.

### 1B. Frontend Agent (`.worktrees/frontend` | branch `feat/frontend`)
- **Allowed paths:** `src/features/tasks/components/`, `src/features/tasks/index.ts`, `src/app/` (excluding `src/app/api/`)
- **Tasks:**
  1. Build Arrow-function React components (`const Component: React.FC = () => ...`):
     - `src/features/tasks/components/create-task-form.tsx`
     - `src/features/tasks/components/task-card.tsx`
     - `src/features/tasks/components/task-board.tsx`
  2. Follow semantic HTML5 (`<main>`, `<section>`, `<article>`), `aria-label` on all controls, Tailwind v4 gradients (`bg-linear-to-*`), and `try/catch` around `fetch('/api/tasks')`.
  3. Export the public UI surface from `src/features/tasks/index.ts`.
  4. Render `<TaskBoard />` in `src/app/page.tsx` with unique metadata (`title`, `description`).
  5. Commit changes to `feat/frontend`.

### 1C. Unit Tester Agent (`.worktrees/tester` | branch `test/unit`)
- **Allowed paths:** `tests/`
- **Tasks:**
  1. Wait for Phase 1 Merge Gate (or write contract-based test cases in `tests/task-store.test.ts` without touching `src/`).
  2. After `git rebase main`, run `npm test` against merged Backend + Frontend code and report results to Supervisor.

### Phase 1 Merge Gate (Supervisor on `main`)
1. Review & merge `feat/backend` -> `main`.
2. Frontend runs `git rebase main` in `.worktrees/frontend` (resolving any conflicts itself) -> Supervisor merges `feat/frontend` -> `main`.
3. Unit Tester runs `git rebase main` in `.worktrees/tester`, runs `npm test`, and upon green pass Supervisor merges `test/unit` -> `main`.

---

## Phase 2 — Update Status & Delete Tasks (Step 2: Parallel)
- **Backend (`feat/backend`):** Rebase on `main`, then add `updateTask`, `deleteTask` in `dal/task-store.ts` and `PATCH` / `DELETE` in `src/app/api/tasks/[id]/route.ts`.
- **Frontend (`feat/frontend`):** Rebase on `main`, then add status filter tabs (`all`, `todo`, `in_progress`, `done`), status change controls, and delete button with `aria-label`.
- **Unit Tester (`test/unit`):** Rebase on merged `main`, add tests for `PATCH`, `DELETE`, 404 errors, and invalid status transitions; run `npm test`.
- **Phase 2 Merge Gate:** Sequential review -> rebase -> merge -> verify on `main`.
