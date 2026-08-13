# Comparison App — Savings Rate Comparison MVP

A public comparison site for savings account rates, built as a static site
(Astro) that will eventually be fed by a scheduled Playwright crawler. See
project history/chat for the full architecture and milestone plan.

## Status: Milestone 2

The public site (`src/`) reads from `data/current/savings.json`. The
real, structural wiring of crawler output into the site is still
Milestone 5 — but as each bank gets a real adapter below, we've been
hand-correcting that bank's entry in `savings.json` to match the real
crawled numbers (rather than leaving a known-wrong fictional Figma-mock
number live on the page). Banks without an adapter yet are still the
original mockup figures.

There's a real, working crawler in `crawler/` with adapters for **Ally
Bank**, **Marcus by Goldman Sachs**, **Capital One**, **Barclays**,
**Betterment**, **Wealthfront**, **Flagstar Bank**, **Axos Bank**, and
**E*TRADE**, each visiting the bank's actual savings/cash page and
extracting the live APY. The crawler writes its own separate file per
bank (`data/current/{bankId}.json`) so it can never collide with or
corrupt the frontend's `savings.json`.

**Ally has been intermittently failing** after this session's unusually
heavy traffic to ally.com (dozens of hits during development) — see the
`note` on its `banks.json` entry. Likely soft rate-limiting on Ally's
end, not a real selector break; the existing crawled data is still
accurate, just worth knowing about if it recurs.

**`apy` vs `baseApy`**: several banks (Betterment, Wealthfront) advertise
a *top* rate that only applies with a promotional boost stacked on top
of their *ongoing* rate. `apy` is always the top rate you can actually
get right now ("showcase the top rates, no matter what product" — this
is also what sorting/ranking uses); `baseApy` is the ongoing rate with
no boost applied, equal to `apy` when there's no boost to distinguish.
The UI shows both whenever they differ (small "X% ongoing" note next to
the headline rate, plus a "Base Rate (No Promo)" field in the row
detail) so a temporary teaser rate never gets mistaken for a durable
one. See `crawler/adapters/betterment.ts` for the pattern.

Betterment and Wealthfront are cash management accounts, not chartered
bank savings accounts (they're not banks — FDIC coverage runs through
partner "program banks") — included since they're commonly compared
alongside high-yield savings anyway; see the `note` field on their
`data/banks.json` entries.

Two banks are not fully wired up, for real reasons worth knowing about
rather than papering over — both documented via a `note` field on their
`data/banks.json` entry:

- **Discover Bank is deactivated** (`active: false`): its savings page
  now redirects entirely to Capital One's product with a "Discover is
  now part of Capital One" banner — it's not an independently priced
  product anymore, so we don't list it separately. This is exactly the
  "a product disappears from a page" scenario the status system was
  designed to handle, just discovered a milestone earlier than
  expected.
- **Synchrony Bank is removed from the site** (`active: false`, at the
  user's request): its site is protected by Akamai Bot Manager, which
  blocks or stalls the crawler's connection. We're not attempting to
  bypass it (no stealth/fingerprint-spoofing tricks) — that's a
  deliberate line, not a gap to fix. The adapter (`crawler/adapters/synchrony.ts`)
  is written and correct, it just can't reach the page; re-activate in
  `banks.json` if the block ever lifts.

Banks without an adapter yet are skipped with a clear `no_adapter` log
entry rather than guessing at extraction logic for pages nobody's
inspected yet. Adding a bank is: write `crawler/adapters/{id}.ts`,
register it in `crawler/adapters/index.ts`, done — the engine itself
never changes.

Everything the crawler produces is stamped `status: "needs_review"`.
Nothing gets promoted to `verified` automatically — that's what the
validation layer (Milestone 3) is for.

**Table now has a dedicated Bonus column** (between Min. Deposit and Key
Terms), showing the promo bonus and its expiration when a bank has one.
When a bonus exists, `keyTerms` is written to explain that bonus's
actual eligibility conditions (deposit amount, holding period, etc.)
rather than generic fee copy — see the Barclays adapter for the
pattern. Banks without a bonus keep the general fee/minimum copy in
Key Terms.

Several `savingsUrl` values in `data/banks.json` turned out to be stale
during this pass (bank sites redirect and consolidate more often than
you'd expect) and were corrected as each adapter was built, with a
`note` explaining what changed.

**Known future direction (not built yet):** `banks.json` currently
maps one bank to one URL/product. Several brands actually offer
multiple comparable products worth tracking separately (e.g. a savings
account *and* a CD, or multiple savings tiers at different balance
thresholds) — eventually a bank entry should be able to point at
several URLs/product types rather than just one, at the user's
request. `apy`/`baseApy` already covers the *rate* side of this
(promo vs. ongoing, whether that's two tiers of the same product like
Flagstar/E*TRADE or two differently-named products like Axos), but a
genuinely separate product line (e.g. a CD alongside a savings
account) still needs its own row, which the current one-bank-one-URL
config can't express yet. Flagging now rather than waiting for it to
become a bigger refactor later.

### Running the crawler

```bash
npx playwright install chromium   # one-time, downloads the browser binary
npm run crawl
```

This writes `data/current/{bankId}.json` for each bank that has an
adapter, plus a run log to `data/crawl-logs/`.

## Getting started

You'll need [Node.js](https://nodejs.org) installed (LTS version). Then:

```bash
npm install
npm run dev
```

This starts a local dev server (usually at `http://localhost:4321`) that
live-reloads as you edit files.

To build the static production site (what GitHub Actions will eventually run):

```bash
npm run build
```

Output goes to `dist/`.

## Project structure

```
/src
  /components   Reusable UI pieces (KpiCard, Leaderboard, ComparisonTable, ...)
  /layouts      Page shell (BaseLayout.astro)
  /lib          Data loading, types, formatting helpers
  /pages        Routes — index.astro is the homepage
  /styles       Global CSS + design tokens (global.css)
/data
  banks.json           Bank config the crawler reads (id, active, url, adapter)
  savings.json         (via /current) Hand-written sample data — powers the live site for now
  /current
    savings.json       Sample data the frontend actually reads (Milestone 1)
    {bankId}.json       Real crawled snapshot per bank, e.g. ally.json (Milestone 2+)
  /history             (not yet used — historical rate tracking, Milestone 4)
  /crawl-logs          Per-run crawl logs (outcome + errors per bank)
/crawler
  /core                engine.ts (orchestration), types.ts (adapter interface)
  /adapters            One file per bank (ally.ts, ...) + index.ts registry
  run.ts               Entry point — `npm run crawl`
```

## Design tokens

Colors, font (Manrope), and spacing are pulled directly from the Figma file
and defined once in `src/styles/global.css` under `@theme`. Components use
those utilities (`bg-panel`, `text-ink`, `text-ink-muted`, etc.) rather than
hardcoding hex values, so a future palette change only touches one file.
