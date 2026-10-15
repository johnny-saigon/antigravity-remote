---
trigger: always_on
description: Tier 2 Shared Cluster Invariants for projects colocated on Vast.ai (85.10.218.46:44016) — Port allocations, Redis DB indexing, Postgres/S3 isolation, Supervisor rules, and cuda:0 GPU exclusivity.
---

# Tier 2: Shared Cluster Invariant Guardrails (`.agents/rules/infra.md`)

This machine-enforceable safety contract applies across all sister projects (**`RemoveBackGround`**, **`BinaryDay`**, **`SnapCal`**, and **`AntigravityRemote`**) colocated on the dedicated Vast.ai compute node (`85.10.218.46:44016`, Instance `50951592`).

## 1. Shared Cluster Allocation Matrix (`85.10.218.46:44016`)

| Project | Supervisor Daemon | Internal Port | Caddy Ingress (`:10100` / Ext `:44190`) | PostgreSQL 16 (`:5432`) | Redis 7 (`:6379`) | GPU (`cuda:0`) |
| :--- | :--- | :---: | :--- | :--- | :---: | :---: |
| **`RemoveBackGround`** | `model_server` | `127.0.0.1:7861` | `/api/*` (`removeback.gd`) | DB: `removebg` | **`DB 2`** | **100% Dedicated** (RTX 4060 Ti 16GB) |
| **`BinaryDay`** | `binaryday` | `127.0.0.1:4001` | `/binaryday/*` (`binaryday.app`) | DB: `binaryday` | **`DB 0`** | **0 Bytes (Forbidden)** |
| **`SnapCal`** | `snapcal` | `127.0.0.1:4002` | `/snapcal/*` (`snapcal.io`) | DB: `snapcal` | **`DB 1`** | **0 Bytes (Forbidden)** |
| **`AntigravityRemote`** | `antigravity_remote` | `127.0.0.1:8787` | `/antigravity*` (`removeback.gd/antigravity`) | JSON Store (`data/store.json`) | None | **0 Bytes (Forbidden)** |

## 2. Non-Negotiable Cluster Safety Rules
1. **GPU Exclusivity on `cuda:0`**: `AntigravityRemote` runs strictly on CPU (`0 bytes` VRAM) and invokes Gemini over HTTPS via `@google/genai`.
2. **Process & Daemon Isolation**: Only restart `supervisorctl restart antigravity_remote` or `supervisorctl restart removebg_caddy`. Never run `supervisorctl restart all`.
3. **Caddy Ingress Preservation (`/workspace/caddy/Caddyfile`)**: Preserve all existing `Host` blocks and path handlers when adding `/antigravity*`.
