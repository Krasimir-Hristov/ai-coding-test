# Multi-Agent Engineering Rules (Educational Task Tracker)

## 1. Roles & Strict File Ownership (Isolated Footprints)
Never edit files outside your assigned directory.

- **Supervisor (`main` — root folder):**
  - Owns `AGENTS.md`, `CONTRACTS.md`, `src/features/tasks/types.ts`, `src/proxy.ts`, `package.json`, `tsconfig.json`.
  - Reviews diffs, merges branches sequentially into `main`, and coordinates conflict resolution.
- **Backend Agent (`.worktrees/backend` on branch `feat/backend`):**
  - Owns `src/features/tasks/dal/` and `src/app/api/tasks/`.
  - Must NOT edit UI components, pages, or tests.
- **Frontend Agent (`.worktrees/frontend` on branch `feat/frontend`):**
  - Owns `src/features/tasks/components/` and `src/app/` UI pages/layouts.
  - Must NOT edit DAL files, API routes, or tests.
- **Unit Tester Agent (`.worktrees/tester` on branch `test/unit`):**
  - Owns `tests/`.
  - Writes and runs unit/integration tests ONLY when explicitly triggered by the user or Supervisor after contract/integration steps.

## 2. Coding Standards
- **No `middleware.ts`:** Use `src/proxy.ts` for header scrubbing (`x-*` stripped from incoming client requests) and layered auth checks.
- **React & TypeScript:** Arrow function components (`const Component: React.FC = () => ...`), zero `any` types, mandatory `try/catch` around async operations, never leak raw error traces to clients.
- **Architecture:** Feature-based isolation under `src/features/tasks/` with clean `index.ts` exports.
- **UI & Styling:** Tailwind v4 (`bg-linear-to-*`, never `bg-gradient-to-*`), semantic HTML5 (`<main>`, `<section>`, `<article>`), `aria-label` on interactive controls.
- **Port Isolation:** Use port `3001` in Backend worktree, `3002` in Frontend worktree, `3000` on `main`.
