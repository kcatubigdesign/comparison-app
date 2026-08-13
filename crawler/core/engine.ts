import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import type { BankConfig, ProductSnapshot, RateStatus } from "../../src/lib/types";
import type { BankAdapter, CrawlLogEntry } from "./types";

const ROOT = path.resolve(import.meta.dirname, "../..");
const BANKS_PATH = path.join(ROOT, "data/banks.json");
const CURRENT_DIR = path.join(ROOT, "data/current");
const CRAWL_LOGS_DIR = path.join(ROOT, "data/crawl-logs");

// Identifies the crawler honestly to any bank that inspects request
// headers, and gives them a way to reach us — standard etiquette for
// a bot that isn't trying to hide what it is.
const USER_AGENT =
  "SaveRateComparisonBot/0.1 (+https://github.com/kcatubigdesign/comparison-app; contact: kimcatubig.design@gmail.com)";

// Pause between banks so we're not hammering multiple sites back to
// back in the same second.
const POLITE_DELAY_MS = 2000;

export async function runCrawl(adapters: Record<string, BankAdapter>) {
  const banks: BankConfig[] = JSON.parse(readFileSync(BANKS_PATH, "utf-8"));
  const activeBanks = banks.filter((b) => b.active);

  mkdirSync(CURRENT_DIR, { recursive: true });
  mkdirSync(CRAWL_LOGS_DIR, { recursive: true });

  // --disable-http2: at least one target site (Synchrony) rejects the
  // HTTP/2 connection headless Chromium negotiates with a hard
  // ERR_HTTP2_PROTOCOL_ERROR, even though it loads fine in a normal
  // browser. Forcing HTTP/1.1 works around it without any downside
  // for the other sites.
  const browser = await chromium.launch({ args: ["--disable-http2"] });
  const context = await browser.newContext({ userAgent: USER_AGENT });
  const logs: CrawlLogEntry[] = [];

  for (const [index, bank] of activeBanks.entries()) {
    const startedAt = new Date().toISOString();
    const adapter = adapters[bank.adapterId];

    if (!adapter) {
      console.log(`[skip] ${bank.name}: no adapter registered for "${bank.adapterId}" yet`);
      logs.push({
        bankId: bank.id,
        startedAt,
        finishedAt: new Date().toISOString(),
        outcome: "no_adapter",
        message: `No adapter registered for adapterId "${bank.adapterId}"`,
      });
      continue;
    }

    if (index > 0) {
      await new Promise((resolve) => setTimeout(resolve, POLITE_DELAY_MS));
    }

    const page = await context.newPage();
    try {
      console.log(`[crawl] ${bank.name}: visiting ${bank.savingsUrl}`);
      await page.goto(bank.savingsUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

      const extracted = await adapter.extract(page, bank);

      if (!extracted.productName || !Number.isFinite(extracted.apy)) {
        throw new Error(
          `Adapter returned incomplete data (productName="${extracted.productName}", apy=${extracted.apy})`
        );
      }

      const snapshot: ProductSnapshot = {
        bankId: bank.id,
        bankName: bank.name,
        productName: extracted.productName,
        apy: extracted.apy,
        interestRate: extracted.interestRate ?? null,
        minOpeningDeposit: extracted.minOpeningDeposit ?? null,
        minBalance: extracted.minBalance ?? null,
        promoBonus: extracted.promoBonus ?? null,
        offerExpirationDate: extracted.offerExpirationDate ?? null,
        keyTerms: extracted.keyTerms ?? "Not extracted — see source",
        sourceUrl: page.url(),
        lastCheckedAt: new Date().toISOString(),
        // Crawled data always starts as needs_review. Nothing gets
        // promoted to verified without passing the validation layer
        // (Milestone 3) — a crawler succeeding just means it got
        // *some* data, not that the data is trustworthy yet.
        status: "needs_review" satisfies RateStatus,
        recentApyTrend: [],
      };

      const outPath = path.join(CURRENT_DIR, `${bank.id}.json`);
      writeFileSync(outPath, JSON.stringify(snapshot, null, 2) + "\n");
      console.log(`[ok] ${bank.name}: ${snapshot.apy}% APY -> ${path.relative(ROOT, outPath)}`);

      logs.push({ bankId: bank.id, startedAt, finishedAt: new Date().toISOString(), outcome: "success", message: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[fail] ${bank.name}: ${message}`);
      logs.push({
        bankId: bank.id,
        startedAt,
        finishedAt: new Date().toISOString(),
        outcome: "extraction_failed",
        message,
      });
    } finally {
      await page.close();
    }
  }

  await browser.close();

  const logPath = path.join(CRAWL_LOGS_DIR, `${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(logPath, JSON.stringify(logs, null, 2) + "\n");
  console.log(`\nCrawl log written to ${path.relative(ROOT, logPath)}`);

  return logs;
}
