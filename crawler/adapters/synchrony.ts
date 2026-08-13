import type { BankAdapter } from "../core/types";

// Synchrony's savings page (checked live on 2026-08-13) also displays
// CD rates further down the same page, so everything here is scoped
// to `section.hysbanner` (the High Yield Savings hero banner) to
// avoid ever picking up a CD rate by accident.
export const synchronyAdapter: BankAdapter = {
  async extract(page) {
    const rateEl = page.locator("section.hysbanner span.banner-card-per").first();
    await rateEl.waitFor({ state: "attached", timeout: 15000 });
    const rateText = (await rateEl.textContent()) ?? "";
    const apyMatch = rateText.match(/(\d+(?:\.\d+)?)/);
    if (!apyMatch) {
      throw new Error(`Could not parse an APY number out of rate element text: "${rateText}"`);
    }
    const apy = parseFloat(apyMatch[1]);

    let keyTerms: string | null = null;
    try {
      const items = page.locator("section.hysbanner ul.checkmark-list li");
      const texts = await items.allTextContents();
      keyTerms = texts.map((t) => t.trim()).filter(Boolean).join(", ") || null;
    } catch {
      keyTerms = null;
    }

    // Unlike other banks so far, Synchrony's own copy distinguishes
    // "no minimum deposit" from "no minimum balance" as separate
    // bullets, so we can derive both fields instead of just one.
    const minOpeningDeposit = keyTerms && /no minimum deposit/i.test(keyTerms) ? 0 : null;
    const minBalance = keyTerms && /no minimum balance/i.test(keyTerms) ? 0 : null;

    return {
      productName: "High Yield Savings",
      apy,
      minOpeningDeposit,
      minBalance,
      keyTerms: keyTerms ?? "Not extracted — see source",
    };
  },
};
