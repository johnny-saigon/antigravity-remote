# Antigravity Remote — Development & Backlog Board

This board tracks active development tickets, feature backlogs, architecture initiatives, and sprint milestones for Antigravity Remote.

---

## 1. Active Feature Backlog

### FEAT-101: Official Antigravity Zero-G Glass UI & 2x2 SSAA Retina PNG Icons
- **Status:** Completed (`DONE`)
- **Priority:** High
- **Components:** `src/icons.ts`, `public/index.html`, `public/manifest.json`
- **Description:** Render the floating delta-prism Antigravity SVG glyph and programmatically generate 180x180, 192x192, and 512x512 Retina PNG icons on #07080C Deep Void Obsidian.
- **Technical Specification:**
  Pure Node.js CRC32 + Zlib IDAT PNG encoder with 2x2 Supersampling Anti-Aliasing and Brave iOS visualViewport pinning.
- **Acceptance Criteria:**
  - [x] Inline SVG logo rendered in top bar, login hero, and empty watermark.
  - [x] apple-touch-icon.png (180x180) generated and served under /antigravity/.

---

### FEAT-102: Zero-Config Gemini Profile Hydration & 7 MCP Auto-Discovery
- **Status:** Completed (`DONE`)
- **Priority:** High
- **Components:** `src/profileSync.ts`, `src/server.ts`
- **Description:** Automatically introspect ~/.gemini/GEMINI.md, mcp_config.json, hooks.json, and all 4 colocated Vast.ai workspaces on login.
- **Technical Specification:**
  Parallel 900ms health probes across :8787, :7861, :4001, and :4002 plus hydrated Slash Prompt Chips.
- **Acceptance Criteria:**
  - [x] Auto-discovers AntigravityRemote, RemoveBackGround, BinaryDay, and SnapCal.
  - [x] Surfaces all 7 MCP servers (Vast.ai, Cloudflare, OVH, GitHub, Stitch, Resend, Stripe).

---

### FEAT-103: Real Workspace Tool Execution & One-Tap Antigravity Rollbacks
- **Status:** Completed (`DONE`)
- **Priority:** High
- **Components:** `src/agentEngine.ts`, `src/store.ts`, `public/index.html`
- **Description:** Execute read_file, edit_file, write_file, and run_command via gemini-3.5-flash with pre-turn #cp-xxxxxx file snapshots and one-tap Rollback to here.
- **Technical Specification:**
  Snapshot modified files prior to write and restore in reverse chronological order on POST /api/projects/:id/rollback.
- **Acceptance Criteria:**
  - [x] Every turn creates a WorkspaceCheckpoint (#cp-xxxxxx).
  - [x] Tapping Rollback restores modified files and rewinds prompt into composer.

---

### FEAT-104: User Profile Security Markers Bar & 30-Minute Inactivity Auto-Logout
- **Status:** Completed (`DONE`)
- **Priority:** High
- **Components:** `src/server.ts`, `public/index.html`
- **Description:** Display authenticated user login (jbb@avilo.capital), TLS/JWT security markers, and enforce a 30-minute (1800s) sliding inactivity auto-logout.
- **Technical Specification:**
  Dual client countdown + server sessionRegistry sliding 1800s expiration with manual Lock button.
- **Acceptance Criteria:**
  - [x] Security bar displays user identity, TLS 1.3 marker, and live 30:00 countdown.
  - [x] Session automatically revokes and locks after 30 minutes of inactivity.

---

### FEAT-105: Interactive File Diff Viewer Modal on Checkpoint Cards
- **Status:** Backlog (`TODO`)
- **Priority:** High
- **Components:** `src/store.ts`, `public/index.html`
- **Description:** Allow tapping the (N files snapshotted) badge on any turn card to preview unified before/after code diffs on Brave iOS before deciding to rollback.
- **Technical Specification:**
  Render a Zero-G Glass diff modal comparing originalContent vs newContent from checkpoint.modifiedFiles.
- **Acceptance Criteria:**
  - [ ] Tapping snapshotted files badge opens mobile-optimized unified diff view.
  - [ ] Supports direct one-tap rollback from inside the diff modal.

---

### FEAT-106: One-Tap Git Commit & Push Action from Mobile Turn Card
- **Status:** Backlog (`TODO`)
- **Priority:** Medium
- **Components:** `src/server.ts`, `public/index.html`
- **Description:** Provide a one-tap Commit & Push button alongside Rollback on turns that modified workspace files.
- **Technical Specification:**
  Add POST /antigravity/api/projects/:id/commit endpoint with semantic commit message generation.
- **Acceptance Criteria:**
  - [ ] Commits modified files in active workspace and pushes to origin.
  - [ ] Updates active git SHA badge in the top Workspace Pill.

---

## 3. Completed Migration Milestones

- [x] **MILESTONE-1**: Antigravity Remote v1.0 Microserver & Brave iOS Deployment
- [x] **MILESTONE-2**: Antigravity Remote v1.1 Workspace Tools, Rollbacks & 30m Auto-Logout
- [x] **MILESTONE-3**: Canonical Brand Book, UX Brief, Architecture Docs & Three-Tier Memory Bank

