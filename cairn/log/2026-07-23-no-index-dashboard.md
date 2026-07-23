---
cairn: log
change: no-index-dashboard
landed: 2026-07-23
---

# Keep the dashboard out of search engines and AI crawlers

Made the dashboard non-indexable, the mirror image of the marketing site's all-crawlers-welcome posture.

- Added `public/robots.txt`: a blanket `User-agent: * / Disallow: /`, plus the major AI crawlers named explicitly (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot, Bytespider, Amazonbot, Applebot-Extended, meta-externalagent, and friends).
- Added a `noindex, nofollow, noarchive, nosnippet, noimageindex` robots meta to `index.html`.

Capability moved: `principles`: **ADDED** *Not indexable*. The dashboard is a private, login-less control panel with nothing to index; the public surface is carillon.pimalaya.org.

Note: robots.txt + meta cover compliant crawlers. For hard enforcement, the serving layer could also send an `X-Robots-Tag: noindex` header (backend `rust-embed` origin and the SaaS CDN). Left as a serving-side follow-up, not done here.
