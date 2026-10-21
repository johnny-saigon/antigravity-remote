<!-- antigravity-planning-sync -->
# Implementation Plan — Antigravity Remote: Next Sprint Wave (FEAT-105)

## 1. Goal Description
- **Project North Star**: Self-Hosted Microserver & Mobile-First Web Client for Brave Browser on iOS — styled with official Antigravity Zero-G Glass branding, powered by Zero-Config Gemini Profile Hydration (`@google/genai`), equipped with real workspace tool execution (`read_file`, `edit_file`, `write_file`, `run_command`), Antigravity Checkpoints & One-Tap Rollbacks, and protected by a 30-minute sliding inactivity auto-logout.
- **Current Phase**: `v1.1.0` Production Live, Three-Tier Memory Bank, On-the-Fly Lifecycle Hooks & Decoupled Backlog Engine Active.
- **Planning Scope (`NEXT_WAVE`)**:
  - **[FEAT-105] Interactive File Diff Viewer Modal on Checkpoint Cards** (`HIGH` · Status: `todo`): Allow tapping the (N files snapshotted) badge on any turn card to preview unified before/after code diffs on Brave iOS before deciding to rollback.

## 2. User Review Required
> [!IMPORTANT]
> **Architectural Guardrails & Pre-Execution Alignment**:
> - **Explore → Plan → Execute Workflow**: Review the proposed file modifications and verification commands below. Leave inline artifact comments on any file path or interface signature to refine the plan before running `/backlog-start <ID>`.
> - **Supervisor Daemon**: `antigravity_remote` (`/workspace/antigravity-remote/dist/server.js`)
> - **Internal Bind**: `127.0.0.1:8787` (strictly loopback-isolated; `0 Bytes GPU VRAM` on `cuda:0`)
> - **Pooled Caddy Ingress**: `/workspace/caddy/Caddyfile` (`:10100` -> External `:44190`) via `handle /antigravity*` with `flush_interval -1`
> - **Cloudflare Edge**: Origin Rule `ef061d98952e415e9c9ca015c0024df9` (`:44190`) + Page Rules bypassing cache on `*/antigravity/api/*`

## 3. Proposed Changes
### [FEAT-105] Interactive File Diff Viewer Modal on Checkpoint Cards
- **Specification**: Render a Zero-G Glass diff modal comparing originalContent vs newContent from checkpoint.modifiedFiles.
- **Component Modifications (Dependencies First)**:
  - `[MODIFY]` [store.ts](file:///Users/jbb/Documents/AntigravityRemote/src/store.ts) (`src/store.ts`)
  - `[MODIFY]` [index.html](file:///Users/jbb/Documents/AntigravityRemote/public/index.html) (`public/index.html`)
- **Acceptance Criteria**:
  - Tapping snapshotted files badge opens mobile-optimized unified diff view.
  - Supports direct one-tap rollback from inside the diff modal.

## 4. Verification Plan
### Automated & Deterministic Terminal Verification
```bash
npm run lint:memory
npm run typecheck
npm run build
```

### End-to-End & Sprint Closure Checklist
1. Execute all deterministic test, typecheck, and build commands above with `0` errors.
2. Verify `npm run lint:memory` passes with `< 150 lines` across all `memory-bank/*.md` files.
3. For integration/OAuth tickets, verify live end-to-end provider HTTP requests pass before running `npm run backlog done <ID>`.
4. Record verification proof in `walkthrough.md`, `memory-bank/activeContext.md`, and `memory-bank/progress.md`.
