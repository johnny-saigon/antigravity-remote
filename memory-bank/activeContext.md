# Active Context — Antigravity Remote (`v1.0.0`)

- **Deployment Target**: Vast.ai (`85.10.218.46:44016`, Instance `50951592`) at `/workspace/antigravity-remote` on `127.0.0.1:8787` (`supervisorctl status antigravity_remote`).
- **Public URL**: `https://designengineering.io/antigravity`
- **Hydrated Inventory**:
  - **Workspaces (4)**: `AntigravityRemote`, `RemoveBackGround`, `BinaryDay`, `SnapCal`
  - **MCP Servers (7)**: `Vast.ai`, `Cloudflare`, `OVH`, `GitHub`, `Stitch`, `Resend`, `Stripe`
  - **Hooks Bridge**: `~/.gemini/config/hooks.json` (`PreToolUse`, `PostToolUse`, `Stop` -> `http://127.0.0.1:8787/antigravity/api/webhooks/antigravity`)
