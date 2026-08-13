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

There's a real, working crawler in `crawler/` — currently with adapters
for **Ally Bank** and **Marcus by Goldman Sachs**, each visiting the
bank's actual savings page and extracting the live APY. The crawler
writes its own separate file per bank (`data/current/{bankId}.json`) so
it can never collide with or corrupt the frontend's `savings.json`.

Banks without an adapter yet are skipped with a clear `no_adapter` log
entry rather than guessing at extraction logic for pages nobody's
inspected yet. Adding a bank is: write `crawler/adapters/{id}.ts`,
register it in `crawler/adapters/index.ts`, done — the engine itself
never changes.

Everything the crawler produces is stamped `status: "needs_review"`.
Nothing gets promoted to `verified` automatically — that's what the
validation layer (Milestone 3) is for.

The `savingsUrl` values in `data/banks.json` for banks without an adapter
yet are still best-guess and unverified — check them before building their
adapters.

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
