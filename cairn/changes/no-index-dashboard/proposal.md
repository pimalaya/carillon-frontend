---
cairn: change
id: no-index-dashboard
status: landed
created: 2026-07-23
---

# Keep the dashboard out of search engines and AI crawlers

## Why
The dashboard is a private, login-less control panel. There is nothing to index and no reason for it to appear in search results or be scraped for AI training/answers. The marketing site (carillon.pimalaya.org) is the public, indexable surface; this app should be its mirror image on crawling.

## What
Add `public/robots.txt` disallowing all crawlers (a blanket `User-agent: *` plus the major AI crawlers named explicitly), and a `noindex, nofollow` robots meta in `index.html`. Record a "Not indexable" principle so future work doesn't reintroduce SEO artefacts here.
