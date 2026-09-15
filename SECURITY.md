# SECURITY.md — Project96 threat model (prototype)

This is a hackathon demo, not a production system. This document is deliberately
honest about what is real and what is mocked so it can be defended to judges
without overclaiming.

## What is real

- **Session cookie.** `POST /api/auth/login` validates the submitted email/password
  against a seeded, server-side user list and issues a session token: a
  base64url JSON body (`{userId, role, name, org, exp}`) plus an HMAC-SHA256
  signature over that body, computed with `crypto.subtle` (Web Crypto, not a
  hand-rolled hash). The token is set as an **`httpOnly`, `sameSite=strict`,
  `secure`** cookie — it is never written to `localStorage` and is not
  readable from client JavaScript. See `src/lib/session.ts`.
- **Edge-enforced route guarding.** `src/middleware.ts` runs before any page
  in `/mo/*`, `/police/*` or `/fsl/*` is served. It verifies the session
  signature, and if the token's role does not match the route's role prefix,
  it redirects to `/403` — the page component is never reached, so there is
  no client-side check to bypass. This is demonstrable directly: log in as
  Police, then paste an `/mo/...` URL into the address bar.
- **Server-side re-check on every mutation.** `POST /api/custody/append` is
  called before any custody event is committed client-side. It independently
  re-derives the role from the signed cookie and checks it against the
  action being attempted (`src/lib/actions.ts`), returning 401/403 if the
  cookie is missing/expired or the role isn't authorised for that action —
  regardless of what the calling UI thinks it's allowed to do.
- **The hash chain and signatures are real cryptography.** Every custody
  event's hash is `SHA-256(prevHash + canonicalJSON(rest of event))`,
  computed with `crypto.subtle.digest`. `verifyChain()` recomputes every
  hash from genesis and reports the first point of divergence. Seal payloads
  are signed with real HMAC-SHA256 (`crypto.subtle.sign`), not a placeholder
  function that always returns `true`.

## What is mocked, and why

- **No backend database.** Per the brief, this prototype ships with no
  Postgres/Supabase/Prisma — case, specimen and event data lives in an
  in-memory store hydrated to `localStorage` in the browser. This means the
  custody "ledger" is **not tamper-resistant against someone with access to
  the browser's dev tools** in this build: a determined user could edit
  `localStorage` directly and the hash chain would (correctly) flag it as
  broken the next time `Verify chain` runs, but nothing stops the edit
  itself. A production deployment would move `cases`/`events`/`specimens`
  into an append-only server-side store (e.g. Postgres with an
  insert-only events table and no UPDATE/DELETE grants) and make
  `/api/custody/append` the sole writer.
- **The chain-signing key (`CHAIN_SIGNING_KEY` in `src/lib/crypto.ts`) is a
  constant shipped in the client bundle**, because seal/QR signing happens
  client-side (the QR is rendered directly in the browser with no server
  round-trip) and there is no database to hold a server-only key against. In
  production this key would live server-side only, and signing would happen
  via an API call the client cannot forge.
- **Seeded users and plaintext demo passwords.** All three accounts use the
  same password (`Demo@2026`) stored in source (`src/lib/users.ts`) for
  fast, reliable live demos. A real deployment would hash passwords
  (bcrypt/argon2) and back them with a real identity provider.
- **The session secret (`SESSION_SECRET` in `src/lib/session.ts`) is a
  hardcoded string**, not an environment variable, again to keep the demo
  deployable with zero configuration. Rotate this and move it to a real
  secret store before any non-demo use.
- **No rate limiting, no audit-log tamper protection beyond the hash chain,
  no CSRF token** (mitigated partially by `sameSite=strict`), no transport
  security beyond what Vercel provides by default.

## Bottom line

The **routing/role boundary** and the **cryptographic chain** are real and
independently verifiable. The **data persistence layer** is a client-side
demo substitute for a database and is explicitly out of scope for the
2-hour build — swapping it for a real backend does not require changing the
crypto, auth, or UI layers, only where `recordEvent()` in `src/lib/store.ts`
persists to.
