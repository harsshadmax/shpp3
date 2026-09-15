# NOTES.md — build assumptions

Decisions made without stopping to ask, in the interest of a working demo:

- **Stack versions.** `create-next-app@latest` installed **Next.js 16.3.4**
  (App Router, Turbopack), not 15 as originally specified — 15 is no longer
  what `latest` resolves to. Everything in the brief (App Router,
  `middleware.ts`, route handlers, Server/Client components) works
  identically on 16. `middleware.ts` prints a deprecation notice in favour
  of a new `proxy.ts` convention; kept `middleware.ts` since the brief asks
  for it by name and both work today.
- **Server-side mutations without a database.** The brief asks for no
  database but also for "every server-side mutation re-checks the role from
  the cookie." Resolved by adding `POST /api/custody/append`: every custody
  write calls this route first, which independently verifies the session
  cookie and the role-vs-action permission (`src/lib/actions.ts`) before the
  event is committed to the client store. It persists nothing (there is
  nowhere to persist to), but it is a real, curl-able authorization check —
  not a client-side illusion. See `SECURITY.md` for the full picture.
- **Seal/QR signing key lives client-side.** Because QR generation is
  entirely client-side (per the brief) and there's no server database to
  hold a private key against, `CHAIN_SIGNING_KEY` is a constant in the
  client bundle. This is flagged explicitly in `SECURITY.md` rather than
  glossed over.
- **Case `SAEC-2026-0147` is seeded fresh (step 0).** The brief's own demo
  script (§10) says to open case `0147` and "walk the stepper" live, which
  only works if that case hasn't already been walked. It's one of the two
  seeded "in examination" cases; the other (`0141`) is seeded mid-stepper so
  the dashboard doesn't look empty on first load.
- **One user per role.** All eight seeded cases share the same hospital,
  police station and FSL, because there is exactly one seeded login per
  role. Varying "MLC number" / case IDs was enough to make the lists look
  populated without inventing logins that can't actually be demoed.
- **Physical custody vs. business-rule integrity are separate signals.**
  `CaseStatus` can be `INTEGRITY_COMPROMISED` without the cryptographic hash
  chain being broken — e.g. the seeded seal-number-mismatch case is
  cryptographically intact (nothing was tampered with after recording) but
  is flagged by the **anomaly rules engine** because the seal number
  physically observed at receipt didn't match the one recorded at sealing.
  Only the FSL tamper-demo control and a genuine hash mismatch flip a case
  through `runChainVerify`. This mirrors the brief's own distinction between
  "chain integrity verification" (§5.3.3) and "anomaly detection" (§5.3.4)
  as two separate engines over the same event log.
- **Transfer codes are reused across both hops.** Police→FSL transfer uses
  the same `verifyIncoming`/seal-QR mechanism as MO→Police, rotating only
  the 6-digit transfer code (`initiateTransferToFSL` regenerates
  `case.transferCode`). The original seal QR payload doesn't change hands
  twice with different content — the physical seal is the same object, only
  the digital "who may currently claim it" code rotates per hop.
- **"Filterable by age" on the FSL tracking board** was interpreted as age
  *in current custody stage* (hours since `stageEnteredAt`), consistent with
  the ageing colour convention used on the Police custody register, rather
  than survivor age band — the brief's design-system section ties ageing
  colours to custody duration, not demographics.
- **Cut nothing** from the §9 build order — all six phases shipped,
  including CSV export and the PWA manifest.
