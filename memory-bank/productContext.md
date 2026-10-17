# AntigravityRemote — Product Context & Mobile UX Specification

> Full specifications: @[Brand Book](../docs/BRAND_BOOK.md) · @[Mobile UX Brief](../docs/UX_BRIEF.md)

## 1. Visual Design System ("Zero-G Glass")
- **Canvas**: Deep Void Obsidian (`#07080C`) with top radial ambient glow (`rgba(124, 58, 237, 0.14)` → `rgba(56, 189, 248, 0.03)`).
- **Glass Surfaces**: `rgba(15, 17, 26, 0.85)` (`backdrop-filter: blur(20px)`) with `1px solid #1E2235` specular borders and `rgba(255, 255, 255, 0.08)` top-edge highlight.
- **Prism Accent Gradient**: `linear-gradient(135deg, #7C3AED 0%, #4F46E5 50%, #38BDF8 100%)`.
- **Orbital Status Dots**: `Idle` (`#38BDF8`), `Running` (`#A855F7` + `1.2s` pulse), `Completed` (`#10B981`), `Blocked` (`#F43F5E`).
- **Official Antigravity Logo**: Floating delta-prism "A" with `-12°` orbital ring and 2×2 SSAA Retina PNG icons (`apple-touch-icon.png` `180×180`, `icon-192.png`, `icon-512.png`).

## 2. Brave iOS Ergonomics & Workflows
1. **`visualViewport` Pinning**: `#app-shell` binds to `--vvh` and `--vvo` so the iOS keyboard, dictation waveform, and Brave address bar never push the header off-screen.
2. **Anti-Zoom & Edge Guards**: All inputs enforce `font-size: 16px`; horizontal interactive rows keep a `24px` edge buffer to avoid Brave back/forward swipe collisions.
3. **Security & Identity Bar**: Displays `👤 jbb@avilo.capital · mac-mighty-vertex`, `🛡️ TLS 1.3 · HMAC-JWT · Loopback :8787`, live `⏱ 30:00` countdown, and manual Lock button.
4. **One-Tap Antigravity Rollbacks**: Every turn card features `⚓ #cp-xxxxxx · HEAD` and a `↺ Rollback to here` button that reverts modified files and rewinds the prompt into the composer.
