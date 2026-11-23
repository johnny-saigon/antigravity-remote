<!-- antigravity-doc-sync -->
# 🔐 antigravity-remote — Security, Auth & Compliance (`docs/architecture/SECURITY_AND_COMPLIANCE.md`)

> **Index**: [`docs/INDEX.md`](../INDEX.md) · **Memory Baseline**: [`memory-bank/integrationsAndCustomizations.md`](../../memory-bank/integrationsAndCustomizations.md) · [`.agents/rules/negative-constraints.md`](../../.agents/rules/negative-constraints.md)

## 1. Authentication, OAuth 2.0 / OIDC & Session Security
- **Secret Hygiene**: Raw `.env*` secrets, private keys (`*.p8`, `*.pem`), and bearer tokens MUST NEVER be committed to Git.
- **External Boundary Validation**: All external API payloads and OAuth callbacks must be validated before persistence.
- **Account Deletion & Privacy Compliance**:
  - **Apple App Store Guideline `5.1.1(v)`**: Revoke Apple OAuth tokens via `https://appleid.apple.com/auth/revoke` upon account deletion.
  - **Meta / Facebook GDPR Compliance**: Verify `signed_request` HMAC-SHA256 payloads on the data-deletion callback endpoint.

---

## 2. Environment Variable & Credential Contract (Secrets Masked)

<!-- ag-section:security-env:start -->
_Progressive scaffold: automatically synchronized from `.env*` and brick contracts with secret literals redacted._
<!-- ag-section:security-env:end -->

---

## 3. Consolidated Project Specifications

<!-- ag-section:legacy-security:start -->
<!-- harvested-repo-context:start -->
### Harvested Repository & Memory-Bank Context

- **From [`memory-bank/integrationsAndCustomizations.md`](../../memory-bank/integrationsAndCustomizations.md) (Memory Bank Baseline)**:
  - **Workspace Root**: `~/Documents/AntigravityRemote` · **Git Remote**: `https://github.com/johnny-saigon/antigravity-remote.git` (`main`)
  - **Directory Layout**: `src/`, `scripts/`, `docs/`, `memory-bank/`, `.agents/`
  - **Colocated Sibling Repos**: `~/Documents/Binaryday`, `~/Documents/Binaryday-Base44`, `~/Documents/Design Engineering Website`, `~/Documents/PlayTask`, `~/Documents/SnapCal`, `~/Documents/SnapCal-Base44`, `~/Documents/WinorBuy`, `~/Documents/Wiro`, `~/Documents/antigravity-memory-bank`, `~/Documents/rbgd`
  - **Pre-Authenticated Host Token & CLI Stores**: `~/.github_token` (GitHub PAT ✅) · `~/.stripe_token` (Stripe API ✅) · `~/.stitch_token` (Google Stitch ✅) · `~/.ovh_credentials.json` (OVHcloud API ✅) · `~/.meta_credentials.json` (Meta Graph & App ✅) · `~/.meta_token` (Meta Business Token ✅) · `~/.azure/azureProfile.json` (Azure & Entra CLI ✅) · `~/.linkedin_mcp/account_identity.json` (LinkedIn Session ✅) · `~/Library/Application Support/mj/config.json` (Midjourney Profile ✅) · `~/.mcp-auth/mcp-remote-v1` (MCP OAuth2 Cache ✅)
  - **Workspace `.env` Files**: None detected (uses pre-authenticated host stores & `~/.gemini/config/mcp_config.json`).
<!-- harvested-repo-context:end -->
<!-- ag-section:legacy-security:end -->
