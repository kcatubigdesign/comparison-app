# Comparison App — Savings Rate Comparison MVP

A public comparison site for savings account rates, built as a static site
(Astro) that will eventually be fed by a scheduled Playwright crawler. See
project history/chat for the full architecture and milestone plan.

## Status: Milestone 1

This is the static site shell, styled to match the Figma design, reading
from **hand-written sample data** in `data/current/savings.json` — there is
no crawler yet. The sample data mirrors the numbers from the original Figma
mockup so the UI can be verified against the design.

`data/banks.json` is the config file the crawler will read from once it
exists (Milestone 2+). The `savingsUrl` values in it are best-guess public
URLs for each bank's savings page — **not yet verified** — double-check them
before Milestone 2 crawler work begins.

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
  banks.json         Bank config the crawler will read (id, active, url, adapter)
  /current           Latest snapshot per bank/product (sample data for now)
  /history           (not yet used — historical rate tracking, Milestone 4)
  /crawl-logs        (not yet used — crawl run logs, Milestone 2+)
/crawler        (not yet built — Milestone 2)
```

## Design tokens

Colors, font (Manrope), and spacing are pulled directly from the Figma file
and defined once in `src/styles/global.css` under `@theme`. Components use
those utilities (`bg-panel`, `text-ink`, `text-ink-muted`, etc.) rather than
hardcoding hex values, so a future palette change only touches one file.
