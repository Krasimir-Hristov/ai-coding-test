# ai-coding-test

Educational multi-agent repository demonstrating **Supervisor + Git Worktrees** parallel AI development.

## Structure
- `.` (`main`) — Supervisor workspace, shared types ([types.ts](src/features/tasks/types.ts)), and contracts ([CONTRACTS.md](CONTRACTS.md)).
- `.worktrees/backend` (`feat/backend`) — Isolated workspace for the Backend agent.
- `.worktrees/frontend` (`feat/frontend`) — Isolated workspace for the Frontend agent.
- `.worktrees/tester` (`test/unit`) — Isolated workspace for the Unit Tester agent.
