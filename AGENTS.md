# AntigravityRemote — Agent Architecture & Domain Rules (`AGENTS.md`)

## 1. Three-Tier Memory Hierarchy
- **Tier 1 (`~/.gemini/GEMINI.md`)**: Global developer preferences, ES Modules + TypeScript (`strict: true`) + Zod policies, and semantic Conventional Commits.
- **Tier 2 (`.agents/rules/infra.md`)**: Shared Vast.ai (`85.10.218.46:44016`) cluster invariants (`127.0.0.1:8787`, Supervisor `antigravity_remote`, `0B VRAM`).
- **Tier 3 (`memory-bank/activeContext.md`)**: Project-specific state, Brave iOS UX specs, and subpath routing (`/antigravity`).

## 2. Core Technical Stack
- **Server**: Node.js 20+ ES Modules, TypeScript (`strict: true`), Fastify 5, `@google/genai`, `zod`.
- **Client**: Zero-G Glass Mobile PWA for Brave Browser on iOS (`100dvh` + `visualViewport` pinning, 16px inputs, inline Antigravity SVG & generated Retina PNG icons).
- **Routing**: Subpath-aware (`/antigravity`) routed via Cloudflare + OVH (`https://designengineering.io/antigravity`) and Vast.ai Caddy (`:10100` / Ext `:44190`).
