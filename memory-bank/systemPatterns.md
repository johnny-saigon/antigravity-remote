# AntigravityRemote — System Patterns & Technical Architecture

> Full specification: @[Logical & Technical Architecture](../docs/ARCHITECTURE.md)

## 1. Core Technical Stack
- **Server**: Node.js 20+ ES Modules (`"type": "module"`), TypeScript (`strict: true`), Fastify 5, `zod` boundary validation.
- **AI & Tool Engine**: Official `@google/genai` SDK (`gemini-3.5-flash` primary, `gemini-3.8-flash` failover, `thinkingBudget: 0`).
- **Persistence**: `StateStore` (`data/store.json`) storing conversation history, SSE hook traces, and `WorkspaceCheckpoint` file snapshots.

## 2. Key Architectural Modules (`src/`)
- [`src/server.ts`](../src/server.ts): Subpath-aware router (`/antigravity` & `/`), Host PIN (`1631`) + `HS256` JWT + `HttpOnly` strict cookie, 30-minute (`1800s`) sliding `sessionRegistry`, and SSE broadcaster (`15s : ping` heartbeat).
- [`src/profileSync.ts`](../src/profileSync.ts): Zero-Config introspection of `~/.gemini/GEMINI.md`, `mcp_config.json`, `hooks.json`, git repositories, and parallel `900ms` local port health probes (`:8787`, `:7861`, `:4001`, `:4002`).
- [`src/agentEngine.ts`](../src/agentEngine.ts): Multi-turn function-calling loop (`read_file`, `edit_file`, `write_file`, `run_command`) with path-traversal sandboxing (`resolveSafe`) and pre-write file snapshotting.
- [`src/store.ts`](../src/store.ts): Reverse-chronological file & conversation rollback (`rollbackToMessage`).
- [`src/icons.ts`](../src/icons.ts): Zero-dependency SVG & 2×2 SSAA PNG rasterizer (CRC32 + Zlib `IDAT` encoder).
- [`scripts/hooks-bridge.sh`](../scripts/hooks-bridge.sh): Forwards `PreToolUse`, `PostToolUse`, and `Stop` hooks from `~/.gemini/config/hooks.json` to `/antigravity/api/webhooks/antigravity`.
