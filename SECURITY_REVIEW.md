# Security review — 20-point pen-test checklist (2026-11-19)

CodeArchaeologist is a static frontend (vanilla JS, one 3D/WebGL page) that
fetches public GitHub repo history client-side and sends it to one Vercel
serverless function (`api/ask.js`), which calls Gemini to reason about the
history. No accounts, no database. An optional GitHub personal access token
is stored only in the visitor's own `localStorage` and used only for GitHub
API calls — confirmed it is never sent to `/api/ask`. Reviewed `api/ask.js`,
`app.js`, and the `esc()`/innerHTML usage across `explore.html`,
`timemachine.html` and `preview.html`.

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | HTTP/2 Rapid Reset | N/A | Vercel serverless function; no self-managed HTTP server. |
| 2 | bcrypt 72-byte limit | N/A | No passwords/accounts. |
| 3 | SAML signature bypass | N/A | No SAML. |
| 4 | nOAuth | N/A | No OAuth. |
| 5 | GraphQL alias batching | N/A | No GraphQL. |
| 6 | TOTP replay | N/A | No TOTP/2FA. |
| 7 | ReDoS | No | Only small fixed regexes (code-fence stripping, a bounded `/\{[\s\S]*\}/`, `esc()`'s `/[&<>]/g`) — no nested quantifiers. |
| 8 | JWT algorithm confusion | N/A | No JWTs. |
| 9 | HTTP request smuggling | N/A | Vercel's edge terminates HTTP. |
| 10 | Web cache poisoning | N/A | `/api/ask` sets no cache headers; every response is a fresh, per-request reasoning result. |
| 11 | Spoofed X-Forwarded-For | N/A | No IP-based logic anywhere in this app. |
| 12 | Postgres views bypassing RLS | N/A | No database. |
| 13 | `Math.random()` for security tokens | N/A | No tokens/ids generated server-side; the GitHub PAT is something the *user* creates on github.com and pastes in, not something this app generates. |
| 14 | Timing attacks on secret comparison | N/A | No secret comparison anywhere. |
| 15 | Padding oracle | N/A | No encryption. |
| 16 | Server-side prototype pollution | No | `api/ask.js` reads named string fields (`mode`, `repo`, `question`, `context`) with explicit `.toString().slice(...)` coercion and looks the mode up in a fixed `SHAPES`/`INTRO` map rather than merging the body into anything — no injection path. |
| 17 | Server-side template injection | N/A (see finding below for the client-side analog) | No server-side templating; responses are JSON. |
| 18 | XXE | N/A | No XML parsing. |
| 19 | Cross-site WebSocket hijacking | N/A | No WebSocket endpoint. |
| 20 | Unicode username normalization | N/A | No usernames/login. |

## Findings outside the 20-point list

1. **Attribute-breakout XSS via `esc()` not escaping quotes — directly
   reachable through attacker-authored GitHub content.** `esc()` in
   `app.js` only replaces `&`, `<` and `>`, not `"`/`'`. It's used to build
   `href` attributes from `sources[].url` in `explore.html` and
   `timemachine.html`: `'<a href="'+esc(s.url||"#")+'" ...>'`. Critically,
   `sources` can come from **`d.sources` — the Gemini response itself**
   (`var srcs=(d.sources&&d.sources.length?d.sources:sources||[])` prefers
   the AI's own `sources[].url` over the client-gathered commit URLs), and
   the model is prompted to produce that field from `context`, which is
   built from **commit messages, PR bodies and issue text pulled from the
   target repo** — content anyone can write by opening a PR or issue
   against a public repository, or (for a repo the visitor doesn't control)
   content already there. A crafted commit message / issue body containing
   prompt-injection text asking the model to emit a `sources[].url` value
   like `" onmouseover="..." x="` would, if the model complies, break out of
   the `href` attribute and inject an active attribute — this is a more
   directly reachable version of the same gap found in `verifyai`
   (attribute-breakout via `esc()`'s missing quote-escaping), because here
   the untrusted upstream content (repo history text) is something any
   GitHub user can contribute, not something that merely needs to be
   search-indexed. Everywhere `esc()` wraps **text content** (labels,
   summaries, grades) remains safe. Suggested fix (not applied — pending
   your approval): build these `<a>` elements with `createElement`/
   `setAttribute('href', ...)`/`textContent`, or extend `esc()` to also
   encode `"` and `'`.
2. **No server-side rate limiting + permissive CORS**, same pattern as
   `praxis`, `autoredteam`, `verifyai` and `tutor-mind` elsewhere in this
   portfolio: `Access-Control-Allow-Origin: *` with no per-IP limiting on an
   endpoint that calls Gemini (`/api/ask`, used across 7 different modes).

## What's already handled well

- `preview.html`'s "Change Preview" renders AI-generated HTML (`changedHtml`)
  in `<iframe sandbox="">` with `srcdoc`, correctly fully sandboxed (scripts
  disabled, no same-origin) — the one place in this app that handles
  genuinely AI-authored *whole documents* safely.
- The GitHub personal access token is stored only in the visitor's own
  `localStorage`, attached only to GitHub API requests (`app.js`'s `gh()`
  helper), and confirmed never forwarded to `/api/ask`.

## Summary

Two findings outside the 20-point list: (1) `esc()` doesn't escape quote
characters, creating an attribute-breakout XSS path via AI-returned
`sources[].url` that's ultimately sourced from arbitrary, attacker-writable
GitHub commit/PR/issue content — the most directly exploitable instance of
this pattern found so far in this portfolio; and (2) `/api/ask` has no rate
limiting and permissive CORS. No fix has been applied here — per your
standing instructions, this is reported for approval before any change is
made.
