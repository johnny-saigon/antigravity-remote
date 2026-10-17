# AntigravityRemote — Project Brief & North Star

## 1. Executive Summary & Vision
- **Product Name**: Antigravity Remote (`v1.1.0`)
- **Repository**: `https://github.com/johnny-saigon/antigravity-remote`
- **Tagline**: Self-Hosted Microserver & Mobile-First Web Client for Brave Browser on iOS — styled with official Antigravity Zero-G Glass branding, powered by Zero-Config Gemini Profile Hydration (`@google/genai`), equipped with real workspace tool execution (`read_file`, `edit_file`, `write_file`, `run_command`), Antigravity Checkpoints & One-Tap Rollbacks, and protected by a 30-minute sliding inactivity auto-logout.
- **Canonical Docs**: @[Brand Book](../docs/BRAND_BOOK.md) · @[UX Brief](../docs/UX_BRIEF.md) · @[Architecture](../docs/ARCHITECTURE.md)

## 2. Target Platforms & Distribution Scope
- **Primary Client**: Brave Browser on iOS (`100dvh` + `window.visualViewport` pinned PWA with `180×180` SSAA Retina `apple-touch-icon.png`).
- **Live Edge Endpoints**:
  - Primary: `https://removeback.gd/antigravity/`
  - Mirror: `https://binaryday.app/antigravity/`
- **Host Node**: Vast.ai (`85.10.218.46:44016`, Instance `50951592`) at `/workspace/antigravity-remote` (`127.0.0.1:8787`).

## 3. Core Capabilities
1. **Zero-Config Gemini Profile Hydration**: Auto-discovers 4 colocated Vast.ai workspaces (`AntigravityRemote`, `RemoveBackGround`, `BinaryDay`, `SnapCal`), 7 MCP servers (`Vast.ai`, `Cloudflare`, `OVH`, `GitHub`, `Stitch`, `Resend`, `Stripe`), and 3-Tier `GEMINI.md` rules.
2. **Real Workspace Tool Execution & Checkpoints**: Executes `read_file`, `edit_file`, `write_file`, and `run_command` via `gemini-3.5-flash` (`thinkingBudget: 0`), creating pre-turn `#cp-xxxxxx` snapshots for one-tap `↺ Rollback to here`.
3. **Session Protection**: Host PIN (`1631`) + `HS256` JWT + `HttpOnly; Secure; SameSite=Strict` cookie + 30-minute (`1800s`) sliding inactivity auto-logout.
