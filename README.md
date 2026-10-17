# Antigravity Remote (`v1.1.0`)

**Self-Hosted Microserver & Mobile-First Web Client for Brave Browser on iOS** — styled with official **Antigravity Zero-G Glass branding**, powered by **Zero-Config Gemini Profile Hydration (`@google/genai`)**, equipped with **real workspace tool execution (`read_file`, `edit_file`, `write_file`, `run_command`)**, **Antigravity Checkpoints & One-Tap Rollbacks**, and protected by a **30-minute sliding inactivity auto-logout**.

---

## 📚 Core Documentation

1. [**Brand Book & Visual Design System (`docs/BRAND_BOOK.md`)**](./docs/BRAND_BOOK.md)  
   Official Antigravity delta-prism logo geometry, programmatic 2×2 SSAA Retina PNG icon rasterizer, Deep Void Obsidian (`#07080C`) & Zero-G Glass color tokens, typography scale, and component specifications.
2. [**Mobile UX Brief & Brave iOS Ergonomics (`docs/UX_BRIEF.md`)**](./docs/UX_BRIEF.md)  
   End-to-end user workflows: Zero-Config Gemini Profile Sync, Thumb-Zone Bottom Sheet switcher, Voice-First dictation & Slash Chips, live `PreToolUse`/`PostToolUse`/`Stop` SSE hook telemetry, One-Tap Antigravity Rollbacks (`↺ Rollback to here`), and `100dvh` + `visualViewport` keyboard pinning.
3. [**Logical & Technical Architecture (`docs/ARCHITECTURE.md`)**](./docs/ARCHITECTURE.md)  
   3-Tier Memory Hierarchy (`~/.gemini/GEMINI.md`, `.agents/rules/infra.md`, `AGENTS.md`), Vast.ai cluster allocation matrix (`85.10.218.46:44016`), Cloudflare edge routing (`removeback.gd/antigravity` & `binaryday.app/antigravity`), module breakdown, and full REST/SSE API reference.

---

## 🚀 Live Deployment & Access

- **Primary URL (Cloudflare TLS 1.3 Edge):** `https://removeback.gd/antigravity/`
- **Mirror URL (Cloudflare TLS 1.3 Edge):** `https://binaryday.app/antigravity/`
- **Vast.ai Compute Node:** `85.10.218.46:44016` (Instance `50951592`, Supervisor daemon `antigravity_remote` on `127.0.0.1:8787`)

---

## 🛠️ Local Development & Build

```bash
npm install
npm run typecheck
npm run build
npm start
```
