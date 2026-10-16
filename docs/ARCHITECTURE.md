# Antigravity Remote — Logical & Technical Architecture Specification

**Version:** `1.1.0`  
**Compute Host:** Vast.ai Dedicated Node (`85.10.218.46:44016`, Instance `50951592`)  
**Internal Daemon:** `antigravity_remote` (`127.0.0.1:8787`, managed by `supervisord`)  
**Public Edge Endpoints:** `https://removeback.gd/antigravity/` · `https://binaryday.app/antigravity/`

---

## 1. Logical Architecture Overview

Antigravity Remote is architected as a **zero-bloat, subpath-aware (`/antigravity`) microserver and mobile PWA** that bridges Brave Browser on iOS with the user's self-hosted Antigravity IDE profile (`~/.gemini/`), colocated Vast.ai workspaces, and the Google Gemini API (`@google/genai`).

```mermaid
flowchart TB
    subgraph Client["Brave Browser on iOS (iPhone PWA)"]
        UI["Zero-G Glass UI (public/index.html)"]
        VV["visualViewport Pinning & 30m Activity Timer"]
        SSE_C["EventSource Client (/antigravity/api/stream)"]
    end

    subgraph Edge["Cloudflare Edge Network (TLS 1.3)"]
        CF_RBG["removeback.gd/antigravity/*"]
        CF_BD["binaryday.app/antigravity/*"]
        CF_RULES["Origin Rule (:44190) + API Cache Bypass Page Rules"]
    end

    subgraph VastHost["Vast.ai Compute Node (85.10.218.46:44016 · Instance 50951592)"]
        CADDY["Pooled Caddy Ingress (:10100 -> Ext :44190)\nhandle /antigravity* -> 127.0.0.1:8787"]

        subgraph Microserver["Antigravity Remote Microserver (127.0.0.1:8787)"]
            FASTIFY["Fastify 5 Router & Zod Boundary Validator (src/server.ts)"]
            AUTH["HMAC-SHA256 JWT + HttpOnly Cookie + 30m Sliding Session Registry"]
            SYNC["Zero-Config Profile Hydration Engine (src/profileSync.ts)"]
            AGENT["Gemini Agent & Workspace Tool Engine (src/agentEngine.ts)"]
            STORE["State & Rollback Checkpoint Store (src/store.ts -> data/store.json)"]
            ICONS["2x2 SSAA Retina PNG & SVG Generator (src/icons.ts)"]
        end

        subgraph HostEnv["Host ~/.gemini Profile & Colocated Workspaces"]
            GEMINI_DIR["~/.gemini/GEMINI.md · mcp_config.json · hooks.json"]
            HOOKS_SH["scripts/hooks-bridge.sh (PreToolUse / PostToolUse / Stop)"]
            WS_AG["/workspace/antigravity-remote (:8787)"]
            WS_RBG["/workspace RemoveBackGround (:7861 · cuda:0)"]
            WS_BD["/workspace/binaryday (:4001 · Redis DB 0)"]
            WS_SC["/workspace/snapcal (:4002 · Redis DB 1)"]
        end
    end

    subgraph ExternalAPI["Google Gemini API"]
        GENAI["@google/genai (gemini-3.5-flash / gemini-3.8-flash)"]
    end

    UI <-->|"HTTPS Fetch (Cookie + Bearer JWT)"| CF_RBG & CF_BD
    SSE_C <--|"Server-Sent Events (15s : ping)"| CF_RBG & CF_BD
    CF_RBG & CF_BD --> CF_RULES --> CADDY --> FASTIFY
    FASTIFY --> AUTH & SYNC & AGENT & STORE & ICONS
    SYNC -->|"Introspects"| GEMINI_DIR
    SYNC -->|"Git & HTTP Health Probes"| WS_AG & WS_RBG & WS_BD & WS_SC
    AGENT <-->|"Function Calling (thinkingBudget: 0)"| GENAI
    AGENT <-->|"read_file / edit_file / write_file / run_command"| WS_AG & WS_RBG & WS_BD & WS_SC
    HOOKS_SH -->|"POST /antigravity/api/webhooks/antigravity"| FASTIFY
```

---

## 2. Three-Tier Memory Hierarchy & Cluster Isolation

To prevent context pollution, cross-database corruption, or GPU VRAM exhaustion across the four colocated services sharing the Vast.ai host, Antigravity Remote strictly enforces a **3-Tier Memory Hierarchy**:

| Tier | Canonical Files | Architectural Scope & Responsibility |
| :--- | :--- | :--- |
| **Tier 1 (Global)** | `~/.gemini/GEMINI.md` | Universal developer preferences: ES Modules, TypeScript (`strict: true`), explicit `zod` validation at external boundaries, semantic Conventional Commits, and mandatory `tsc --noEmit` + live `curl` verification before completion. |
| **Tier 2 (Cluster)** | [`.agents/rules/infra.md`](../.agents/rules/infra.md) | Shared Vast.ai (`85.10.218.46:44016`) cluster invariants governing port bindings, `supervisord` daemon isolation, PostgreSQL/Redis database separation, and `cuda:0` GPU exclusivity. |
| **Tier 3 (Project)** | [`AGENTS.md`](../AGENTS.md) · [`memory-bank/activeContext.md`](../memory-bank/activeContext.md) | Repository-specific domain rules, subpath routing (`/antigravity`), Brave iOS ergonomics, and active deployment state. |

### 2.1 Shared Vast.ai Cluster Allocation Matrix (`85.10.218.46:44016`)

| Project | Supervisor Daemon | Internal Port | Caddy Ingress (`:10100` / Ext `:44190`) | PostgreSQL 16 (`:5432`) | Redis 7 (`:6379`) | GPU (`cuda:0`) |
| :--- | :--- | :---: | :--- | :--- | :---: | :---: |
| **`RemoveBackGround`** | `model_server` | `127.0.0.1:7861` | `/api/*` (`removeback.gd`) | DB: `removebg` | **`DB 2`** | **100% Dedicated** (RTX 4060 Ti 16GB) |
| **`BinaryDay`** | `binaryday` | `127.0.0.1:4001` | `/binaryday/*` (`binaryday.app`) | DB: `binaryday` | **`DB 0`** | **0 Bytes (Forbidden)** |
| **`SnapCal`** | `snapcal` | `127.0.0.1:4002` | `/snapcal/*` (`snapcal.io`) | DB: `snapcal` | **`DB 1`** | **0 Bytes (Forbidden)** |
| **`AntigravityRemote`** | `antigravity_remote` | `127.0.0.1:8787` | `/antigravity*` (`removeback.gd` & `binaryday.app`) | JSON Store (`data/store.json`) | None | **0 Bytes (Forbidden)** |

---

## 3. Technical Stack & Module Architecture

### 3.1 Core Runtime & Dependencies ([`package.json`](../package.json))
- **Runtime:** Node.js `>=20.0.0` with native ES Modules (`"type": "module"`).
- **Compiler:** TypeScript `5.8+` (`strict: true`, `target: "ES2022"`, `moduleResolution: "NodeNext"`).
- **HTTP & Streaming Server:** `fastify` (`^5.2.0`), `@fastify/cookie`, `@fastify/cors`, `@fastify/static`.
- **AI SDK:** Official `@google/genai` (`^1.0.0`) configured with `gemini-3.5-flash` primary and `gemini-3.8-flash` automatic failover.
- **Boundary Validation:** `zod` (`^3.24.2`) validating every inbound HTTP body and webhook payload.

---

### 3.2 Module-by-Module Breakdown

#### 1. [`src/server.ts`](../src/server.ts) — Fastify HTTP Server, Auth, Session Timeout & SSE Hub
- **Dual-Prefix Subpath Routing:** Registers all static assets and API routes under both `BASE_PATH` (`/antigravity`) and root (`/`) via `registerApiRoutes(prefix)`. Automatically redirects exact `/antigravity` requests to `/antigravity/` (`HTTP 308`) so relative browser paths (`./api/...`, `./apple-touch-icon.png`) always resolve inside `/antigravity/`.
- **Brave-Safe Dual Authentication:**
  - Signs stateless `HS256` JWT tokens (`signSessionToken`) using `SESSION_SECRET`.
  - Sets a first-party `HttpOnly; Secure; SameSite=Strict; Path=/antigravity; Max-Age=1800` cookie (`ag_session`) **and** returns the token in the JSON body so the client mirrors it in `localStorage` (`Authorization: Bearer <token>`) and SSE query string (`?token=...`).
- **30-Minute (`1800s`) Sliding Inactivity Session Registry:**
  - `sessionRegistry` tracks `{ token, createdAt, lastActivityAt, ip }` for every active session, while `revokedTokens` stores invalidated tokens.
  - `verifyAndTouchSessionToken(token, touch)` checks `now - rec.lastActivityAt > 30 * 60 * 1000`. If expired, the session is deleted, added to `revokedTokens`, and rejected with `HTTP 401`. Otherwise, `rec.lastActivityAt` is updated on every API interaction.
- **SSE Real-Time Stream (`GET /antigravity/api/stream`):**
  - Sends `Content-Type: text/event-stream; charset=utf-8`, `Cache-Control: no-cache, no-transform`, and `X-Accel-Buffering: no` (disabling NGINX/Caddy/Cloudflare response buffering).
  - Emits a `: ping <timestamp>\n\n` comment frame every `15,000ms` to prevent Cloudflare Error 524 idle timeouts.

#### 2. [`src/profileSync.ts`](../src/profileSync.ts) — Zero-Config Gemini & Antigravity Hydration Engine
- **Host Profile Introspection:** Reads `~/.gemini/GEMINI.md`, `~/.gemini/config/config.json`, `~/.gemini/config/mcp_config.json`, `~/.gemini/config/hooks.json`, `~/.gemini/installation_id`, and `~/.gemini/google_accounts.json`.
- **MCP Server Normalization:** Deduplicates configured MCP servers (`cloudflare`, `ovh`, `vast-ai`, `github`, `stitch`, `resend`, `stripe`) and enriches them with transport metadata, tool counts, and domain summaries.
- **Parallel Workspace & Health Discovery:** Iterates across `CLUSTER_PROJECTS`, runs `git rev-parse --abbrev-ref HEAD`, `git log -1 --format="%h · %s"`, and `git status --porcelain` in each repository, and executes parallel non-blocking HTTP probes (`probeLocalPort` with `900ms` `AbortController` timeout) against `:8787`, `:7861`, `:4001`, and `:4002`.

#### 3. [`src/agentEngine.ts`](../src/agentEngine.ts) — Gemini Function-Calling & Workspace Execution Engine
- **Pre-Turn Checkpoint Initialization:** Generates `checkpointId` (`cp-xxxxxx`) and captures the workspace's current `gitBranch` and short `gitHead` SHA before executing any model or tool step.
- **Multi-Turn Tool Execution Loop:** Calls `ai.models.generateContent` with `thinkingConfig: { thinkingBudget: 0 }` and `WORKSPACE_TOOL_DECLARATIONS`:
  1. `read_file({ relativePath })`: Safely reads up to `14,000` characters from a file inside `project.workspacePath`.
  2. `edit_file({ relativePath, search, replace })`: Verifies `search` exists in the file, snapshots the original file into `checkpoint.modifiedFiles` (`snapshotBeforeWrite`), writes the replacement, and records `newContent`.
  3. `write_file({ relativePath, content })`: Snapshots whether the file previously existed and its `originalContent` into `checkpoint.modifiedFiles`, then writes `content`.
  4. `run_command({ command })`: Executes shell commands inside `project.workspacePath` (`8,000ms` timeout), enforcing a hard regex guardrail that blocks `supervisorctl restart all`, `rm -rf /`, and system shutdown commands.
- **Path-Traversal Sandbox:** `resolveSafe(rel)` resolves all paths against `path.resolve(workspacePath)` and throws if the target escapes the workspace root.

#### 4. [`src/store.ts`](../src/store.ts) — Persistent State & Reverse-Chronological Rollback Engine
- Persists `projectStatuses`, `messagesByProject` (up to 80 messages per project), and `recentHooks` (up to 100 events) to `data/store.json`.
- **`rollbackToMessage(projectId, targetMessageId, workspacePath)`:**
  1. Locates the target message turn (automatically pairing an assistant message with its preceding user prompt).
  2. Walks backward from the newest message down to the target turn (`for (let i = toRemove.length - 1; i >= 0; i--)`), iterating each turn's `checkpoint.modifiedFiles` in reverse order.
  3. If `snap.existed` was `true`, restores `snap.originalContent` to disk; if `snap.existed` was `false`, deletes the newly created file (`fs.rmSync`).
  4. Truncates `messagesByProject[projectId]` to before the target turn, resets project status to `'Idle'`, saves `data/store.json`, and returns `{ restoredFiles, removedMessageCount, rolledBackPrompt, messages }`.

#### 5. [`src/icons.ts`](../src/icons.ts) — Zero-Dependency Vector & SSAA PNG Rasterizer
- Exports `ANTIGRAVITY_LOGO_SVG` and `ANTIGRAVITY_APP_ICON_SVG`.
- Implements `generateAntigravityPng(size)` using 2×2 Supersampling Anti-Aliasing (`subOffsets = [0.25, 0.75]`), barycentric triangle rasterization, custom IEEE 802.3 `CRC32` chunk signing, and `zlib.deflateSync` compression to generate `apple-touch-icon.png` (`180×180`), `icon-192.png` (`192×192`), and `icon-512.png` (`512×512`) on startup.

#### 6. [`scripts/hooks-bridge.sh`](../scripts/hooks-bridge.sh) — Antigravity IDE / CLI Hooks Bridge
- Wired into `~/.gemini/config/hooks.json` for `PreToolUse`, `PostToolUse`, and `Stop` lifecycle events.
- Reads hook JSON from `stdin`, enriches it with `hook_event_name` and `cwd`, dispatches an asynchronous non-blocking `curl -s -X POST http://127.0.0.1:8787/antigravity/api/webhooks/antigravity --max-time 2`, and immediately outputs `{"decision": "allow"}` (or `{}` for `PostToolUse`) with exit code `0` so IDE execution is never delayed.

---

## 4. Network, Edge Routing & Process Supervision

### 4.1 Request Routing Chain
1. **DNS & Edge Termination:**
   - `removeback.gd` and `binaryday.app` resolve via Cloudflare proxied `A` records pointing to Vast.ai (`85.10.218.46`).
2. **Cloudflare Origin & Page Rules:**
   - **Origin Rule (`ef061d98952e415e9c9ca015c0024df9`):** Routes external HTTPS traffic (`:443`) to Vast.ai external port **`44190`** (mapped to internal container port `:10100`).
   - **Page Rules (`ae8680cbbf4fc25f3b29ddfc90e95dee` & `853fd9da41daff1cebcb7e3a8c79c2db`):** Match `*/antigravity/api/*` with `cache_level: bypass` so API and SSE responses are never cached at the edge.
3. **Vast.ai Caddy Ingress (`/workspace/caddy/Caddyfile`):**
   - Listens on `:10100` inside `RemoveBackGround` and `BinaryDay` host blocks:
     ```caddyfile
     handle /antigravity* {
         reverse_proxy 127.0.0.1:8787 {
             flush_interval -1
         }
     }
     ```
   - `flush_interval -1` guarantees zero-latency SSE chunk forwarding.
4. **Supervisor Daemons (`/etc/supervisor/conf.d/antigravity_remote.conf`):**
   - `antigravity_remote`: Runs `node /workspace/antigravity-remote/dist/server.js` on `127.0.0.1:8787` with `autorestart=true`.

---

## 5. REST & SSE API Reference

All endpoints are mounted under both `/antigravity/api/*` and `/api/*`.

| Method & Path | Auth | Request Body (Zod Validated) | Response Summary |
| :--- | :---: | :--- | :--- |
| `GET /antigravity/api/health` | Public | — | Returns `{ status: "ok", version: "1.1.0", geminiConfigured, geminiModel, inactivityTimeoutMinutes: 30, sseClients }` |
| `POST /antigravity/api/auth/login` | Public | `{ pin: string, geminiApiKey?: string }` | Verifies `pin === "1631"`, checks Gemini API connectivity, sets `ag_session` `HttpOnly` cookie, registers 30m sliding session, and returns `{ ok, token, security, profile, mcpServers, projects, customPromptChips }` |
| `POST /antigravity/api/auth/logout` | Cookie / Bearer | — | Revokes token in `sessionRegistry` + `revokedTokens`, clears `ag_session` cookie, returns `{ ok: true, loggedOutAt }` |
| `GET /antigravity/api/profile/sync` | Cookie / Bearer | — | Touches 30m sliding session timer and returns hydrated `{ profile, security, mcpServers, projects, customPromptChips, messagesByProject, recentHooks }` |
| `POST /antigravity/api/projects/:id/instruct` | Cookie / Bearer | `{ prompt: string, mode?: string, useGeminiRefinement?: boolean }` | Creates `WorkspaceCheckpoint` (`#cp-xxxxxx`), executes Gemini tool loop (`read_file`, `edit_file`, `write_file`, `run_command`), streams SSE chunks/hooks, and returns `{ ok, userMessage, assistantMessage, messages }` |
| `POST /antigravity/api/projects/:id/rollback` | Cookie / Bearer | `{ messageId: string }` | Restores all files snapshotted in or after `messageId` in reverse chronological order, rewinds `messagesByProject`, broadcasts `rollback_completed`, and returns `{ ok, restoredFiles, removedMessageCount, rolledBackPrompt, messages }` |
| `POST /antigravity/api/webhooks/antigravity` | Local Hook | `{ hook_event_name?, tool_name?, cwd?, summary? }` | Maps `cwd` to project ID, records `ToolEventItem`, broadcasts SSE `hook_event` + `status_changed`, and returns `HTTP 200 {"decision": "allow"}` |
| `GET /antigravity/api/stream` | Cookie / Bearer / `?token=` | — | Opens persistent `text/event-stream` emitting `hook_event`, `status_changed`, `message_created`, `agent_chunk`, `message_completed`, `rollback_completed`, and 15s `: ping` heartbeats |
