# Antigravity Agent Directives — antigravity-remote

You are the Lead Systems Architect for **antigravity-remote**.

## Three-Tier Memory Hierarchy
This project operates inside a strict **Three-Tier Memory Hierarchy**:
- **Tier 1 (Global Config)**: `~/.gemini/GEMINI.md` — Universal developer policies, TypeScript strict mode, Zod validation, and Conventional Commits.
- **Tier 2 (Shared Cluster Invariants)**: [Cluster Invariants](.agents/rules/infra.md) — Machine-enforceable host, port, database, and process safety rules.
- **Tier 3 (Project-Specific Memory Bank)**: `memory-bank/*.md` — Isolated domain logic, data models, sprint state, and acceptance checklists.

## Operational Mandates
1. **Mandatory Memory Bootstrapping**: At the beginning of every session or when prompted with `/start`, ingest all active files in `memory-bank/` prior to proposing code or running commands.
2. **Infrastructure Compliance**: Strictly adhere to the constraints in @[Infrastructure Invariants](memory-bank/infrastructureInvariants.md) and [Negative Constraints](.agents/rules/negative-constraints.md).
3. **On-the-Fly Pertinent Context Registration & Continuous Cycling (`< 150 Lines`)**:
   - **Zero-Manual-Step On-the-Fly Registration**: Whenever the user provides pertinent architectural decisions, API keys/credentials, MCP configs, customizations, repo paths, or domain rules in a message—or whenever your ensuing work adds/modifies integrations, env keys, skills, rules, schemas, or endpoints—**immediately distill and register the pertinent structured facts** (never raw conversation logs) into the appropriate `memory-bank/*.md` file in the same turn without waiting for manual user commands.
   - **Real-Time Lifecycle Hooks**: `.agents/hooks.json` (`SessionStart`, `PostToolUse`, `Stop`) and `.git/hooks/post-commit` automatically run `node scripts/sync-memory-context.mjs --quiet` on the fly to keep `memory-bank/integrationsAndCustomizations.md`, `activeContext.md`, and `progress.md` synchronized.
   - **Line Budget & 2-Phase Cycling**: Keep every `memory-bank/*.md` file strictly **under 150 lines** (split deep domains into linked sub-files using `@`). When a major milestone completes or upon `/update-memory`, execute Phase 1 (Closure & Sync) followed immediately by Phase 2 (Explicit Auto-Start banner).
4. **Passive Observer Invariant**: The Memory Bank (`memory-bank/*.md`) is strictly a read-only context baseline and passive observer. All active feature tickets, development tasks, sprint boards, and bug fix records are maintained in `docs/` (`docs/backlog.json`, `docs/MIGRATION_BOARD.md` or `docs/BACKLOG.md`). Never conduct active operational ticket tracking inside `memory-bank/*.md`.
5. **Decoupled Backlog & Frugal Execution**: Capture tasks offline via `npm run backlog add` or in the Review pane to consume 0 AI tokens. Execute tasks with `[/backlog-start](.agents/skills/backlog-start/SKILL.md)` (e.g. `/backlog-start FEAT-101`), which ingests specs from `docs/backlog.json`, runs deterministic verification, and automatically updates the local backlog and Memory Bank with a full work recap.
6. **Strict End-to-End Verification Before Closure**: NEVER mark any ticket involving third-party integrations, OAuth providers, or external credentials as `done` until live credentials are configured on the server and a real end-to-end integration test passes. If credentials or external setup are pending, the ticket MUST remain `in_progress`.

## Context Links
- **API Keys, MCP Servers & Customizations**: @[Integrations & Customizations](memory-bank/integrationsAndCustomizations.md)
- **North Star & Platform Scope**: @[Project Brief](memory-bank/projectbrief.md)
- **UX Brief, Tokens & Screen Flows**: @[Product Context](memory-bank/productContext.md)
- **Architecture, Schemas & Pipelines**: @[System Patterns](memory-bank/systemPatterns.md)
- **Host Boundaries & Port Allocations**: @[Infrastructure Invariants](memory-bank/infrastructureInvariants.md)
- **Active Sprint & Live Deployments**: @[Active Context](memory-bank/activeContext.md)
- **Acceptance Checklist & Test Matrix**: @[Progress Tracker](memory-bank/progress.md)
- **Workflows**: `[/start](.agents/skills/start/SKILL.md)` · `[/update-memory](.agents/skills/update-memory/SKILL.md)`
