<!-- antigravity-doc-sync -->
# 🚀 antigravity-remote — Migration, Brick & Release Log (`docs/operations/MIGRATION_AND_RELEASE_LOG.md`)

> **Index**: [`docs/INDEX.md`](../INDEX.md) · **Memory Progress**: [`memory-bank/progress.md`](../../memory-bank/progress.md)

## 1. Completed Milestones & Release Cutovers

<!-- ag-section:release-milestones:start -->
| Milestone ID | Title | Status |
| :--- | :--- | :--- |
| **`MILESTONE-1`** | Antigravity Remote v1.0 Microserver & Brave iOS Deployment | DONE |
| **`MILESTONE-2`** | Antigravity Remote v1.1 Workspace Tools, Rollbacks & 30m Auto-Logout | DONE |
| **`MILESTONE-3`** | Canonical Brand Book, UX Brief, Architecture Docs & Three-Tier Memory Bank | DONE |
<!-- ag-section:release-milestones:end -->

---

## 2. Database Migrations & Installed Hexagonal Bricks

<!-- ag-section:db-migrations:start -->
_Progressive scaffold: automatically populated from `bricks/*/brick.json` and SQL/Prisma migration files._
<!-- ag-section:db-migrations:end -->

---

## 3. Consolidated Historical Migration Boards

<!-- ag-section:legacy-migrations:start -->
<!-- harvested-repo-context:start -->
### Harvested Repository & Memory-Bank Context

- **From [`memory-bank/progress.md`](../../memory-bank/progress.md) (Memory Bank Baseline)**:
  - **Typecheck**: `npm run typecheck` (`tsc --noEmit` — 0 errors)
  - **Memory Budget Linter**: `npm run lint:memory` (All 7 files `< 150 lines`, 0 violations)
  - **Backlog Board**: `npm run backlog render` (`docs/backlog.json` → `docs/BACKLOG.md` & `backlog.html`)
  - **Local Health Probe**: `curl -s http://127.0.0.1:8787/antigravity/api/health`
  - **Public Edge Probe**: `curl -s https://removeback.gd/antigravity/api/health` (`HTTP 200`, `version: "1.1.0"`)

- **From [`README.md`](../../README.md) (## 🚀 Live Deployment & Access)**:
  - **Primary URL (Cloudflare TLS 1.3 Edge):** `https://removeback.gd/antigravity/`
  - **Mirror URL (Cloudflare TLS 1.3 Edge):** `https://binaryday.app/antigravity/`
  - **Vast.ai Compute Node:** `85.10.218.46:44016` (Instance `50951592`, Supervisor daemon `antigravity_remote` on `127.0.0.1:8787`)
  ---
<!-- harvested-repo-context:end -->
<!-- ag-section:legacy-migrations:end -->
