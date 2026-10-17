# AntigravityRemote — Infrastructure Invariants

> Shared Cluster Rules: @[Tier 2 Cluster Guardrails](../.agents/rules/infra.md)

## 1. Vast.ai Host & Port Allocations (`85.10.218.46:44016`, Instance `50951592`)
- **Supervisor Daemon**: `antigravity_remote` (`/workspace/antigravity-remote/dist/server.js`)
- **Internal Bind**: `127.0.0.1:8787` (strictly loopback-isolated; `0 Bytes GPU VRAM` on `cuda:0`)
- **Pooled Caddy Ingress**: `/workspace/caddy/Caddyfile` (`:10100` -> External `:44190`) via `handle /antigravity*` with `flush_interval -1`
- **Cloudflare Edge**: Origin Rule `ef061d98952e415e9c9ca015c0024df9` (`:44190`) + Page Rules bypassing cache on `*/antigravity/api/*`
- **Health Check Endpoint**: `http://127.0.0.1:8787/antigravity/api/health` (Public: `https://removeback.gd/antigravity/api/health`)

## 2. Non-Negotiable Cluster Isolation
- **GPU Exclusivity (`cuda:0`)**: 100% reserved for `RemoveBackGround` (`:7861`). `AntigravityRemote` (`:8787`), `BinaryDay` (`:4001`), and `SnapCal` (`:4002`) use `0B VRAM`.
- **Daemon Restart Safety**: Only run `supervisorctl restart antigravity_remote` or `supervisorctl restart removebg_caddy`. Never run `supervisorctl restart all`.
