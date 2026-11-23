# SDINC.dev — Security

Internal record. Not served on the public site.

## Decision: accept the security-header risk on GitHub Pages

**Date:** 2026-11-19 (decision), 2026-11-23 (documented here)
**Status:** risk accepted for the current deploy; no action required until the
host changes.

### What is not applied in production

The site is a static Astro build deployed to **GitHub Pages**. Pages serves
`dist/` verbatim and does **not** turn `public/_headers` into HTTP response
headers (that file is in the Netlify/Cloudflare format). Verified live on
2026-11-18: `https://sdinc.dev/` and `https://retvil.github.io/sdinc.dev/`
return no `Content-Security-Policy`, `X-Frame-Options`,
`X-Content-Type-Options`, `Referrer-Policy`, or `Permissions-Policy`.

In practice that means:

- **No `X-Frame-Options` / `frame-ancestors`** — the page can be embedded in
  an `<iframe>` by a third party (clickjacking surface).
- **No `X-Content-Type-Options: nosniff`** — the browser can, in theory,
  MIME-sniff a response into a different type. With a fully static asset set
  and no user-supplied filenames, this is low severity.
- **No `Content-Security-Policy`** — there is no script-sink on the site that
  an attacker could reach, but the browser has no policy that would block a
  future one.

### Why this was accepted

The attack surface is narrow:

- **No authentication, no user accounts, no session cookies, no PII.**
- **No forms and no user-submitted data.** The site is a static portfolio.
- **The only "interactive" features are client-side:** the dial, the
  direction nodes, the WebAudio SFX, the copy-to-clipboard contact line, and
  the direction demo screens. None of them touch a server.
- **The threat model is a drive-by:** a clickjacking frame would at most let
  someone trick a visitor into interacting with a *display* they can see.
  There is no action on the page that a victim would not want to perform in
  public (no payments, no logouts, no irreversible confirmations).

For a personal portfolio that hosts no secrets and no auth, the residual risk
of the missing headers is low. The cost of fronting the site with a
Cloudflare Transform Rule or a Caddy reverse proxy to *actually apply* them
outweighs that risk at the current scale.

### What to do when the host changes

If the site is ever moved behind a host that reads a `_headers`-style file —
Cloudflare (Transform Rules / a Worker), Netlify, or a Caddy reverse proxy —
the desired header set is already the single source of truth:

- `public/_headers` — per-path rules; `/*.html` gets a `'self'`-scoped CSP,
  `/assets/` and `/_astro/` get a no-scripts CSP, everything else gets
  `X-Frame-Options: DENY`, `nosniff`, `no-referrer`, and a `Permissions-Policy`
  that denies camera/geo/mic/payment/usb.
- `tests/headers.test.ts` — verifies the file is well-formed and that every
  path in `dist/` resolves to exactly one rule. It does **not** verify the
  live host applies the file, so it will stay green regardless of hosting.

When wiring the new host, copy the values from `public/_headers` into its
configuration (Cloudflare Transform Rules or Caddy `header` directives), and
delete `public/_headers` once the header set lives in the host — it will no
longer be a usable source of truth in its current form.

### Out of scope

- **Server-side request validation.** There is no server.
- **Subresource Integrity.** No third-party resources are loaded.
- **HSTS.** Cannot be meaningfully issued by Pages without a custom-domain
  certificate chain; revisit if the apex domain is ever placed behind a CDN
  that supports it.
