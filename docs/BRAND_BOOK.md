# Antigravity Remote — Official Brand Book & Visual Design System

**Version:** `1.1.0`  
**Product:** Antigravity Remote (Official Mobile Companion to the Antigravity IDE)  
**Target Platform:** Brave Browser on iOS & Standalone iOS Home Screen PWA  
**Source Implementation:** [`src/icons.ts`](../src/icons.ts) · [`public/index.html`](../public/index.html) · [`public/manifest.json`](../public/manifest.json)

---

## 1. Brand Essence & Philosophy

**Antigravity Remote** is the official first-party mobile command deck for the Antigravity Agentic IDE. It enables principal engineers and autonomous systems architects to inspect colocated workspaces, monitor live Model Context Protocol (MCP) tool executions, dispatch voice-first coding instructions, and trigger instant workspace rollbacks from an iPhone.

### 1.1 The "Zero-G Glass" Design Ethos
Every visual decision in Antigravity Remote is governed by three core principles:

1. **Weightless Precision ("Zero-G"):** Interfaces float effortlessly over a deep cosmic void (`#07080C`). Surfaces use high-blur translucent obsidian glass (`backdrop-filter: blur(20px)` to `blur(28px)`) with razor-thin `1px` specular top-edge highlights (`rgba(255, 255, 255, 0.08)`) that simulate light refracting across weightless orbital panels.
2. **High-Contrast Telemetry Legibility:** Mobile engineering often happens on the move. Every git branch, port health probe, MCP tool trace, and cryptographic security marker is rendered in crisp monospace typography (`JetBrains Mono` / `SF Mono`) with semantic neon luminescence against deep obsidian backgrounds.
3. **First-Party Native Tactility:** Interactive pills, slash chips, bottom sheets, and send controls respond with immediate hardware-accelerated spring physics (`transform: scale(0.92)` to `0.98`) so the web client feels indistinguishable from a native iOS SwiftUI companion app.

---

## 2. The Official Antigravity Logo & Iconography

### 2.1 Geometric Construction of the Antigravity Glyph
The official **Antigravity Logo** ([`ANTIGRAVITY_LOGO_SVG`](../src/icons.ts#L5-L42)) is a geometric floating delta-prism ("A") encircled by a tilted weightless orbital ring and three satellite nodes on a `256×256` coordinate grid:

```
                    (128, 18) ●  <-- Apex Cyan Satellite Node (#38BDF8, r=5)
                       / \
                      /   \      <-- Specular Crown Highlight (#FFFFFF @ 18%–20% opacity)
                     /  ▲  \
           (38,142) ●══/═\══● (218,116) <-- Tilted -12° Weightless Orbital Ring
                   /  /   \  \              (Back dashed arc + Front solid 7.5px arc)
                  /  / ▲▲▲ \  \  <-- Inner Levitating Prism Core (128,128 -> 154,184 -> 102,184)
                 /__/_______\__\
             (46,204)       (210,204)
```

| Layer | SVG Element / Geometry | Gradient / Fill | Visual Role |
| :--- | :--- | :--- | :--- |
| **1. Ambient Zero-G Field** | `<circle cx="128" cy="120" r="104" />` | `url(#ag-glow)` radial gradient (`#7C3AED` `32%` → `#4F46E5` `12%` → `0%`) | Creates atmospheric luminescence behind the glyph |
| **2. Back Orbital Arc** | `<path d="M 30 146 A 102 34 0 0 1 226 110" />` | `url(#ag-orbit)` (`stroke-width="5.5"`, `stroke-dasharray="6 8"`, `opacity="0.45"`) | Establishes 3D depth behind the delta-prism wing |
| **3. Delta-Prism Main Wing** | `<path d="M 128 28 L 210 204 L 171 204 L 128 108 L 85 204 L 46 204 Z" />` | `url(#ag-prism)` (`#7C3AED` → `#4F46E5` → `#38BDF8`) | Primary ascending "A" structural silhouette |
| **4. Levitating Inner Core** | `<path d="M 128 128 L 154 184 L 102 184 Z" />` | `url(#ag-prism)` (`opacity="0.88"`) | Replaces a static crossbar with a floating inner delta |
| **5. Specular Crown Highlight** | `<path d="M 128 28 L 168 114 L 128 96 L 88 114 Z" />` | `#FFFFFF` (`opacity="0.18"–"0.20"`) | Adds crystalline top-facet light reflection |
| **6. Front Orbital Ring** | `<path d="M 226 110 A 102 34 -12 0 1 30 146" />` | `url(#ag-orbit)` (`stroke-width="7"` to `7.5`, `stroke-linecap="round"`) | Sweeps across the foreground at a `-12°` orbital tilt |
| **7. Satellite Nodes** | `<circle>` at `(128,18)`, `(218,116)`, `(38,142)` | `#38BDF8` (Apex & Right), `#7C3AED` (Left) | Represents active orbital telemetry & connected MCP nodes |

### 2.2 Logo Placement Across the Application
1. **Top Navigation Workspace Pill (`28×28px`):** Anchors the persistent top-left switcher pill alongside the active project name, orbital status dot, git branch, and MCP count.
2. **Login Hero Crest (`76×76px`):** Centered above the authentication card with a deep violet drop-shadow (`filter: drop-shadow(0 8px 28px rgba(124, 58, 237, 0.45))`).
3. **Empty-State Watermark (`72×72px`):** Floating watermark displayed when a workspace stream is empty (`filter: drop-shadow(0 0 24px rgba(124, 58, 237, 0.35))`).
4. **Vector Endpoints (`/antigravity/logo.svg` & `/antigravity/favicon.svg`):** Served directly with `Content-Type: image/svg+xml`.

### 2.3 Programmatic 2×2 SSAA Retina PNG Icon Engine
When a user taps **Share → Add to Home Screen** in Brave on iOS, Apple's SpringBoard requires non-transparent, high-resolution raster PNG icons. Rather than relying on external image binaries or native C++ canvas libraries, [`src/icons.ts`](../src/icons.ts#L117-L262) implements a **zero-dependency mathematical raycaster and PNG encoder**:
- **2×2 Supersampling Anti-Aliasing (SSAA):** Every pixel in [`generateAntigravityPng(size)`](../src/icons.ts#L208-L253) samples 4 sub-pixel coordinates `(0.25, 0.75)` across the barycentric triangle equations (`pointInTriangle`), the `-12°` tilted orbital ellipse (`cos(0.21)`, `sin(0.21)`), the radial ambient glow, and the specular apex crown.
- **Pure Node.js Binary PNG Encoding:** Computes IEEE 802.3 `CRC32` checksums and `zlib.deflateSync` `IDAT` chunks to write valid 8-bit RGBA PNG files on server boot:
  - `public/apple-touch-icon.png` (`180×180px` — iPhone Retina Home Screen icon on `#07080C` obsidian canvas)
  - `public/icon-192.png` (`192×192px` — PWA standard maskable icon)
  - `public/icon-512.png` (`512×512px` — High-DPI splash & app store grade icon)

---

## 3. Color System & Atmospheric Tokens

All colors are codified as CSS custom properties in [`:root`](../public/index.html#L16-L39) to guarantee visual consistency across components.

### 3.1 Core Canvas & Glass Surface Palette

| CSS Token | Hex / RGBA Value | Usage & Visual Role |
| :--- | :--- | :--- |
| `--bg-void` | `#07080C` (`rgb(7, 8, 12)`) | **Deep Void Obsidian** — Primary viewport background, PWA `theme_color`, and `background_color` |
| **Top Radial Ambient Glow** | `radial-gradient(ellipse 90% 45% at 50% -5%, rgba(124, 58, 237, 0.14) 0%, rgba(79, 70, 229, 0.07) 45%, rgba(56, 189, 248, 0.03) 75%, transparent 100%)` | Subtle upper-atmosphere illumination cast across `#app-shell` |
| `--glass-surface` | `rgba(15, 17, 26, 0.85)` | **Zero-G Glass** — Standard elevated cards, assistant messages, workspace pill, and action buttons (paired with `backdrop-filter: blur(20px)`) |
| `--glass-elevated` | `rgba(22, 25, 38, 0.92)` | **Elevated Zero-G Glass** — Bottom sheets, security bar, and composer dock (paired with `backdrop-filter: blur(24px)–blur(28px)`) |
| `--border-specular` | `#1E2235` | Crisp `1px solid` structural border around all glass containers |
| `--border-highlight` | `rgba(255, 255, 255, 0.08)` | `inset 0 1px 0 0` top-edge specular highlight giving panels physical thickness |

### 3.2 Brand Accent & Gradient Tokens

| CSS Token | Value | Usage & Visual Role |
| :--- | :--- | :--- |
| `--accent-violet` | `#7C3AED` | Primary orbital violet stop (`0%`), user prompt card border glow, hook tags |
| `--accent-indigo` | `#4F46E5` | Mid-spectrum harmonic bridge (`50%`), focused input ring border |
| `--accent-cyan` | `#38BDF8` | High-energy terminal cyan (`100%`), git branch badges, code spans, rollback buttons |
| `--prism-gradient` | `linear-gradient(135deg, #7C3AED 0%, #4F46E5 50%, #38BDF8 100%)` | **Antigravity Prism Gradient** — Send button, primary CTA buttons, active Bottom Sheet tabs, and logo fill |
| **User Message Surface** | `linear-gradient(135deg, rgba(124, 58, 237, 0.28) 0%, rgba(79, 70, 229, 0.26) 60%, rgba(56, 189, 248, 0.2) 100%)` | Distinct translucent prism tint for user-dispatched instructions (`border: 1px solid rgba(124, 58, 237, 0.45)`) |

### 3.3 Orbital Status & Semantic Telemetry Tokens

Every workspace and tool hook in Antigravity Remote reports real-time state through an **Orbital Status Dot** (`.orbital-dot`) with matching luminescence:

| Status State | CSS Token | Hex Value | Glow & Animation Behavior |
| :--- | :--- | :--- | :--- |
| **`Idle`** | `--status-idle` | `#38BDF8` (Orbital Cyan) | `box-shadow: 0 0 8px #38BDF8` — Workspace synced and awaiting instruction |
| **`Running`** | `--status-running` | `#A855F7` (Plasma Purple) | `box-shadow: 0 0 12px #A855F7` + `orbitalPulse 1.2s infinite ease-in-out` (`scale(1)` → `scale(1.45)`) |
| **`Completed`** | `--status-completed` | `#10B981` (Emerald Verify) | `box-shadow: 0 0 8px #10B981` — Turn complete, health check `healthy`, TLS marker verified |
| **`Blocked`** | `--status-blocked` | `#F43F5E` (Alert Rose) | `box-shadow: 0 0 10px #F43F5E` — Guardrail block, unreachable port, or auth error |

### 3.4 Typography Hierarchy & Text Colors

| CSS Token | Hex Value | Usage |
| :--- | :--- | :--- |
| `--text-primary` | `#F8FAFC` | Primary headings, active workspace title, user & assistant body copy |
| `--text-secondary` | `#94A3B8` | Subtitles, workspace paths, tool trace descriptions, inactive tab labels |
| `--text-muted` | `#64748B` | Timestamps (`18:10`), input placeholders, Tier 2 allocation footnotes, checkpoint metadata |

---

## 4. Typography System & Scale

Antigravity Remote pairs a clean geometric sans-serif for natural-language reading with a high-density developer monospace for system telemetry.

### 4.1 Font Stacks
- **UI & Prose (`--font-sans`):**
  ```css
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
  ```
- **Code, Git, MCP & Security Telemetry (`--font-mono`):**
  ```css
  --font-mono: 'JetBrains Mono', 'SF Mono', ui-monospace, Menlo, monospace;
  ```

### 4.2 Type Scale & Brave iOS Anti-Zoom Rule

| UI Element | Font Family | Size | Weight | Line Height / Tracking |
| :--- | :--- | :---: | :---: | :--- |
| **Login Hero Title (`h1`)** | `--font-sans` | `22px` | `700` | `letter-spacing: -0.02em` |
| **Composer `<textarea>` & `<input>`** | `--font-sans` / `--font-mono` | **`16px` (`1rem`)** | `400` | **Mandatory `>=16px` on iOS WebKit to prevent automatic viewport zoom on focus** |
| **Bottom Sheet Project Title** | `--font-sans` | `15px` | `600` | `1.3` |
| **Message Card Body (`.msg-card`)** | `--font-sans` | `14.5px` | `400` | `1.5`, `word-break: break-word` |
| **Top Bar Project Name** | `--font-sans` | `14px` | `600` | `letter-spacing: -0.01em`, single-line ellipsis |
| **Inline Code (`code`) & Pre Blocks (`pre`)** | `--font-mono` | `12px–12.5px` | `500` | `#7DD3FC` on `rgba(255,255,255,0.08)` (`pre` on `#050609`) |
| **Slash Prompt Chips (`.prompt-chip`)** | `--font-mono` | `12px` | `500` | `height: 32px`, `border-radius: 9999px` |
| **Live Hook Strip & Tool Traces** | `--font-mono` | `11px–11.5px` | `500` | Single-line ellipsis on live strip; stacked list in cards |
| **Security Markers & Rollback Bar** | `--font-mono` | `10.5px–11px` | `600` | High-contrast pill badges (`#6EE7B7`, `#E0F2FE`, `#DDD6FE`) |

---

## 5. Signature UI Components & Surface Anatomy

### 5.1 Top Navigation Bar & Workspace Pill
- **Anatomy:** Contains the `28×28px` Antigravity glyph, the project title (`AntigravityRemote`), the live `.orbital-dot`, the cyan `git:main` badge, and the violet `7 MCPs` counter inside a `min-height: 44px` pill (`border-radius: 9999px`).
- **Right Action Cluster:** Houses two `42×42px` circular glass icon buttons: **Sync Profile (`#resync-btn`)** and **Session Lock/Logout (`#logout-btn`)**.

### 5.2 Security & Identity Protection Bar (`.security-bar`)
- Positioned directly beneath `.top-nav` on a `rgba(11, 14, 23, 0.92)` strip.
- Displays three live cryptographic and session markers:
  1. **Authenticated Profile Badge (`.sec-user-badge`):** `👤 jbb@avilo.capital · mac-mighty-vertex` (Cyan tint).
  2. **Transport & Auth Marker (`.sec-marker`):** `🛡️ TLS 1.3 · HMAC-JWT · Loopback :8787` (Emerald tint).
  3. **Sliding Inactivity Countdown (`.sec-timer-badge`):** `⏱ 30:00` live second-by-second countdown (Violet tint).

### 5.3 Conversation Stream, Hook Telemetry & Rollback Bar
- **Live Hook Strip (`#live-hook-strip`):** Pinned at the top of `.stream-container`, displaying the most recent `PreToolUse`, `PostToolUse`, `Stop`, or `REVERTED` event in real time.
- **Message Cards (`.msg-card`):**
  - **User Cards:** Right-aligned (`max-width: 90%`), Prism-tinted glass.
  - **Assistant Cards:** Full-widthZero-G Glass with formatted Markdown, collapsible/stacked `.tool-trace-list`, and the **Antigravity Checkpoint & Rollback Bar** (`.rollback-bar`).
- **Rollback Bar (`.rollback-bar`):**
  - Displays the immutable checkpoint hash and git commit (`⚓ #cp-d9b52a · 1540638`) alongside the count of snapshotted files.
  - Features the pill-shaped **`↺ Rollback to here`** button (`.rollback-btn`) styled in orbital cyan (`rgba(56, 189, 248, 0.1)` fill, `#7DD3FC` text).

### 5.4 Voice-First Composer Dock (`.composer-dock`)
- Anchored to the bottom of the visual viewport (`padding-bottom: var(--safe-bottom)`).
- **Hydrated Slash Chips Row (`.chips-scroll`):** Horizontally scrollable pill chips (`✦ /start · Bootstrap Context`, `✦ Verify Health & Typecheck`, `✦ Audit Cluster & GPU VRAM`, etc.) inset `24px` from screen edges.
- **Auto-Expanding Input + Prism Send Button:** `16px` `<textarea>` (`max-height: 112px`) with an inline `Clear` pill and a `44×44px` circular `--prism-gradient` send button.

---

## 6. Brand Voice & Microcopy Guidelines

1. **Concise, Telemetry-First Copy:** Avoid conversational filler. Surface exact port numbers (`:8787`, `:7861`, `:4001`, `:4002`), short git SHAs (`1540638`), and explicit tool names (`read_file`, `edit_file`, `rollback_checkpoint`).
2. **Transparent Truthfulness:** Never claim a file was edited or a policy was applied unless an underlying tool (`edit_file`, `write_file`, `run_command`) actually executed and recorded a rollback snapshot.
3. **Structured Mobile Markdown:** Always format multi-item agent outputs using `- ` bullet points on distinct lines, `### ` section headers, and inline `` `backticks` `` for file paths, commands, and environment identifiers.
