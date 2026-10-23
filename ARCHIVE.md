# Antigravity Project Archive & Session State (`ARCHIVE.md`)

## 1. Session & Conversation Metadata

| Field | Value |
| :--- | :--- |
| **Project** | `antigravity-remote` (`Antigravity Remote v1.1.0`) |
| **Session ID** | `176fa73f-6dc3-4ef1-87d6-3ca339bb81ea` |
| **Conversation ID** | `176fa73f-6dc3-4ef1-87d6-3ca339bb81ea` |
| **`LocalAgentConfig` Save Directory (Workspace)** | `/Users/jbb/Documents/AntigravityRemote/.antigravity` |
| **`LocalAgentConfig` Brain / State Directory** | `/Users/jbb/.gemini/antigravity/brain/176fa73f-6dc3-4ef1-87d6-3ca339bb81ea` |
| **App Data Directory** | `/Users/jbb/.gemini/antigravity` |
| **Workspace Root** | `/Users/jbb/Documents/AntigravityRemote` |
| **Git Remote** | `https://github.com/johnny-saigon/antigravity-remote.git` (`main`) |
| **Archived At (ISO-8601)** | `2026-10-23T22:57:00+02:00` |

## 2. Cleanup & Sanitization Summary

The following transient local binaries, caches, and runtime artifacts were purged prior to archival:

- **Python Bytecode & Caches**: Removed all `__pycache__/` directories and `*.pyc` files.
- **Python Virtual Environments**: Removed `.venv/`, `venv/`, and `env/` directories.
- **Antigravity Runtime Artifacts**: Removed `.antigravity/cache/`, `.antigravity/logs/`, and `.antigravity/sandboxes/`.
- **Ignore Rules (`.gitignore`)**: Added explicit exclusions for `.antigravity/`, `*.litertlm`, `*.bin`, `.venv/`, and `__pycache__/`.

## 3. Archive Contents (`antigravity_project_archive.tar.gz`)

- **Source Code**: `src/` (`server.ts`, `agentEngine.ts`, `profileSync.ts`, `store.ts`, `icons.ts`), `public/`, `scripts/`
- **Documentation & Memory Bank**: `ARCHIVE.md`, `README.md`, `AGENTS.md`, `docs/`, `memory-bank/`, `.agents/`, `.github/`
- **Configuration & Dependency Manifests**: `package.json`, `package-lock.json`, `tsconfig.json`, `requirements.txt`, `.gitignore`
