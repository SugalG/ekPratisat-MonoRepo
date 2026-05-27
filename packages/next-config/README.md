# @repo/next-config

Shared Next.js base configuration for every app in the ekPratishat monorepo
(`client-app`, `admin-app`, `partner-app`). Each app extends this base via
`...baseConfig` in its own `next.config.js`, so a change here propagates to
every app on the next build.

> This package is the single source of truth for Next.js-level concerns that
> should be identical across all apps: monorepo file tracing, framework
> identity, and HTTP security headers.

---

## What it provides

| Setting              | Value                                       | Why                                       |
| -------------------- | ------------------------------------------- | ----------------------------------------- |
| `outputFileTracingRoot` | Monorepo root                            | So Next.js correctly traces dependencies in shared packages |
| `poweredByHeader`    | `false`                                     | Strips `X-Powered-By: Next.js` from every response |
| `headers()`          | Returns `SECURITY_HEADERS` on `/(.*)` | Adds 5 standard browser security directives |

---

## Security Headers

These headers ship with every response from any app extending this config.
They are not the entire security story — Cloudflare (or whatever proxy is in
front of the origin) handles HSTS preloading, TLS configuration, WAF rules,
and Content-Security-Policy. This config covers the application-layer
hardening that should travel with the code regardless of deploy target.

### Why these specifically

The browser is part of the attack surface. Even with bug-free server code,
a missing header can let an attacker frame your site for clickjacking,
trick browsers into MIME-sniffing uploaded files into scripts, leak
sensitive URL fragments to third parties, or request camera/microphone
permissions from compromised code. Each header below removes one of those
attack classes by telling the browser to refuse a specific behavior.

### Headers in detail

#### `Strict-Transport-Security: max-age=15552000; includeSubDomains`

Tells the browser to refuse plain-HTTP requests to this origin (and all
subdomains) for 6 months after first contact. Prevents downgrade attacks
where an attacker on the network strips HTTPS from a request.

- **6 months (15552000s)** is a conservative starting value. Can be raised
  to 1 year (31536000) or 2 years with `preload` once we're confident
  no subdomain needs plain HTTP.
- `preload` is intentionally **not** set here. Adding `preload` and
  submitting to the HSTS preload list is essentially irreversible.
- Cloudflare may set its own HSTS at the edge — that's fine; both layers
  saying "use HTTPS" don't conflict.

#### `X-Frame-Options: SAMEORIGIN`

Refuses to render our pages inside an `<iframe>` on any origin other than
our own. Mitigates **clickjacking** — where an attacker overlays an invisible
iframe of our signin page under their fake "click for free movie" button.

- **Direction matters**: this controls whether OUR site can be embedded by
  others. It does NOT affect whether we can embed other sites (Google Maps,
  YouTube embeds, etc. — those are governed by the embedded site's policy).
- `SAMEORIGIN` (not `DENY`) so that our own subdomains can still embed each
  other if we ever build internal admin tooling that does so.

#### `X-Content-Type-Options: nosniff`

Disables MIME-sniffing. Forces the browser to honor whatever `Content-Type`
the server declared instead of guessing.

- Mitigates attacks where a user uploads a file declared as `image/jpeg`
  but with JavaScript-like contents, and the browser sniffs and runs it
  as a script.
- Next.js sets correct `Content-Type` on every response, so this has zero
  functional impact for us — it's purely defensive.

#### `Referrer-Policy: strict-origin-when-cross-origin`

Limits how much of the page URL is sent in the `Referer` header when a
user navigates to another site.

- **Same-origin** navigation → full URL sent (so internal links and analytics
  work normally).
- **Cross-origin** navigation → only the origin (`https://ekpratishat.com`)
  is sent, not the path. Prevents leaking property IDs, user-specific URLs,
  or other path-level info to third-party destinations.

#### `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`

Whitelists which browser APIs the page is allowed to use.

- `camera=()` — **blocked**. No code currently uses the camera API.
- `microphone=()` — **blocked**. No code currently uses the microphone.
- `geolocation=(self)` — **allowed for our origin only**. Mapbox's
  `GeolocateControl` in `packages/components/src/addPropertyForm.tsx` runs
  inside our origin, so it works. Cross-origin iframes attempting to
  request user location are refused.

**Future maintenance**: when adding features that use the blocked APIs,
update this header. See "Updating the policy" below for guidance.

---

## How apps consume this config

Each app's `next.config.js` imports and spreads the base:

```js
import baseConfig from '@repo/next-config'

const nextConfig = {
  ...baseConfig,
  reactStrictMode: true,
  images: { remotePatterns: [...] },
  // ... app-specific config
}

export default nextConfig
```

Spreading `...baseConfig` first means:
- App inherits `outputFileTracingRoot`, `poweredByHeader: false`, and
  `headers()` automatically.
- If the app needs to override (e.g., add an app-specific header), it can
  define its own `headers()` after the spread and that wins.

To override headers in a specific app without losing the base set, copy
the base headers and add to them — there's no automatic merge in Next.js
for nested config functions.

---

## Updating the policy

### Adding a feature that needs camera or microphone

**Examples**: video calls with agents, AR property tours, voice search.

Update the `Permissions-Policy` value in `next.js`:

```js
"camera=(self), microphone=(self), geolocation=(self)"
```

### Allowing a specific third-party iframe to use geolocation

**Example**: a property comparison widget from another company embedded in
an iframe.

```js
"geolocation=(self \"https://partner-widget.example.com\")"
```

### Allowing our site to be embedded as a widget on partner sites

**Example**: a "ekPratishat listings" widget that partner real estate
agents can embed on their own websites.

Either:
- Remove the `X-Frame-Options` header entirely, OR
- Replace it with `Content-Security-Policy: frame-ancestors 'self' https://partner1.com https://partner2.com`

(`frame-ancestors` is the modern CSP-based equivalent of `X-Frame-Options`
and supports per-domain allowlisting, which `X-Frame-Options` doesn't.)

### Strengthening to A+ score

After confirming everything works at the current level:

- Raise `Strict-Transport-Security` `max-age` from 15552000 to 31536000
  (1 year) or 63072000 (2 years).
- Add `preload` once you're confident no subdomain needs plain HTTP, then
  submit to https://hstspreload.org/.
- Add a `Content-Security-Policy` header — requires careful testing because
  it can break working pages if misconfigured. Worth a dedicated audit pass.

---

## Headers NOT included here and why

| Header | Why not included |
| ------ | ---------------- |
| `Content-Security-Policy` | Requires per-app allowlist of script/style/image sources. Adding casually can blank-screen the site. Worth a dedicated effort. |
| `Cross-Origin-Embedder-Policy`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy` | Useful for sites needing SharedArrayBuffer / high-isolation features. Not needed for a real estate platform. |
| HSTS `preload` flag | Irreversible. Add only after long-term verification. |

---

## Verification

After deploy, confirm headers are present:

```bash
curl -sI https://www.ekpratishat.com | grep -iE "x-frame|x-content|referrer|permissions|strict-transport|x-powered"
```

Or use the public scanner:

```
https://securityheaders.com/?q=www.ekpratishat.com
```

Expected grade after this config + Cloudflare HSTS: **A** (or **A+** once
a Content-Security-Policy is added).

---

## Risk and rollback

These headers are widely supported by every modern browser and have very
low risk of breaking site functionality:

- ✅ Existing Google Maps iframe in contact page — unaffected
- ✅ Future YouTube iframes for property videos — unaffected
- ✅ Mapbox map rendering and GeolocateControl — unaffected
- ✅ All form submissions, auth flows, listing CRUD — unaffected

If any header is found to cause a real issue in production:

1. Comment out the relevant entry in the `SECURITY_HEADERS` array in this
   file.
2. Redeploy. Header stops being sent on next request.
3. Browsers stop enforcing it almost immediately (except HSTS, which is
   cached client-side for `max-age`).

Quick to apply, quick to revert.
