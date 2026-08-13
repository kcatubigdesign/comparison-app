import type { BankAdapter } from "../core/types";

// Betterment's Cash Reserve page (checked live on 2026-08-13) doesn't
// show the base APY as a big hero number like most banks — it only
// appears in a footnote disclosure sentence ("Annual percentage
// yield (variable) is 3.25% as of..."). There are exactly two
// `.bt-footnote-item` elements on the page, so we filter to the one
// containing "Annual percentage yield" to avoid grabbing the other
// (an unrelated FDIC/entity disclosure).
//
// The current promo is a rate *boost* (0.75% APY boost on top of the
// base rate for new customers), not a flat dollar bonus like
// Barclays' — promoBonus is just a string, so this is described in
// plain English rather than forced into a dollar-amount shape.
export const bettermentAdapter: BankAdapter = {
  async extract(page) {
    const footnote = page.locator(".bt-footnote-item", { hasText: /Annual percentage yield/i }).first();
    await footnote.waitFor({ state: "attached", timeout: 15000 });
    const footnoteText = (await footnote.textContent()) ?? "";

    const apyMatch = footnoteText.match(/(\d+(?:\.\d+)?)\s*%/);
    if (!apyMatch) {
      throw new Error(`Could not parse an APY number out of footnote text: "${footnoteText}"`);
    }
    const baseApy = parseFloat(apyMatch[1]);

    const depositMatch = footnoteText.match(/\$(\d+)\s*min deposit/i);
    const minOpeningDeposit = depositMatch ? parseFloat(depositMatch[1]) : null;

    // apy defaults to baseApy and only rises if we find and parse an
    // active promo boost below — never guess a boost is still running.
    let apy = baseApy;
    let promoBonus: string | null = null;
    let offerExpirationDate: string | null = null;
    let keyTerms: string | null = null;
    try {
      const bonusEl = page.locator(".fancy-bullet p", { hasText: /APY boost/i }).first();
      const bonusText = ((await bonusEl.textContent({ timeout: 3000 })) ?? "").replace(/\s+/g, " ").trim();
      keyTerms = bonusText || null;

      const headlineMatch = bonusText.match(/(\d+(?:\.\d+)?%\s*APY\s*boost\s*on\s*up\s*to\s*\$[\w.]+\s*in\s*savings)/i);
      promoBonus = headlineMatch ? headlineMatch[1] : bonusText || null;

      const boostMatch = bonusText.match(/(\d+(?:\.\d+)?)%\s*APY\s*boost/i);
      if (boostMatch) {
        apy = Math.round((baseApy + parseFloat(boostMatch[1])) * 100) / 100;
      }

      const dateMatch = bonusText.match(/through\s+([A-Za-z]+\s+\d{1,2},\s*\d{4})/i);
      if (dateMatch) {
        const parsed = new Date(dateMatch[1]);
        if (!Number.isNaN(parsed.getTime())) {
          offerExpirationDate = parsed.toISOString().slice(0, 10);
        }
      }
    } catch {
      // no active promo banner — not an error, just nothing to report
    }

    return {
      productName: "Cash Reserve",
      apy,
      baseApy,
      minOpeningDeposit,
      promoBonus,
      offerExpirationDate,
      keyTerms: keyTerms ?? "Not extracted — see source",
    };
  },
};
