import type { BankAdapter } from "../core/types";

// Flagstar's savings page (checked live on 2026-08-13) is genuinely a
// 3-tier product comparison, not one single rate:
//   - Flagstar Ready Savings, under $10k balance: 0.05% APY (base tier)
//   - Flagstar Ready Savings, $10k+ balance: 3.75% APY — a "SPECIAL
//     LIMITED-TIME OFFER" for new customers, described as running
//     "over the next 6 months" (no fixed calendar date given)
//   - Flagstar Performance Savings, $25k+ balance: 3.20% APY — the
//     ongoing, non-promotional product
//
// apy = the 3.75% promo (the top rate actually available). baseApy =
// the 3.20% Performance Savings rate — the best rate you can count on
// without relying on a new-customer teaser, which is the more useful
// "ongoing" comparison point than the 0.05% under-$10k tier.
//
// These AEM containers are deeply nested and the promo tier's
// smallest matching ancestor div happens to also contain an unrelated
// modal's inline CSS/JS (messy, but harmless) — rather than fight the
// DOM for a cleaner container, we anchor the regex directly to right
// after each product's name, which is precise regardless of what
// other text surrounds it.
export const flagstarAdapter: BankAdapter = {
  async extract(page) {
    // No named function/const bindings inside this callback — tsx's
    // esbuild transform injects a __name() helper to preserve .name
    // on any named function (declarations, or arrows assigned to a
    // const), and that helper only exists in the Node bundling
    // context, not inside the browser page this source string gets
    // shipped to and eval'd in. A single inline expression with no
    // intermediate named bindings sidesteps the transform entirely.
    const blocks = await page.evaluate(() => ({
      performance: Array.from(document.querySelectorAll("div"))
        .filter((d) => (d.textContent || "").includes("FLAGSTAR PERFORMANCE SAVINGS") && (d.textContent || "").includes("APY"))
        .sort((a, b) => (a.textContent || "").length - (b.textContent || "").length)[0]?.textContent ?? null,
      readyPromo: Array.from(document.querySelectorAll("div"))
        .filter(
          (d) =>
            (d.textContent || "").includes("SPECIAL LIMITED-TIME OFFER") &&
            (d.textContent || "").includes("FLAGSTAR READY SAVINGS") &&
            (d.textContent || "").includes("APY")
        )
        .sort((a, b) => (a.textContent || "").length - (b.textContent || "").length)[0]?.textContent ?? null,
    }));

    const baseMatch = blocks.performance?.match(/FLAGSTAR PERFORMANCE SAVINGS\s*\n?\s*(\d+(?:\.\d+)?)\s*%/i);
    if (!baseMatch) {
      throw new Error(`Could not find Flagstar Performance Savings APY. Block: "${blocks.performance}"`);
    }
    const baseApy = parseFloat(baseMatch[1]);

    const promoMatch = blocks.readyPromo?.match(/FLAGSTAR READY SAVINGS\s*\n?\s*(\d+(?:\.\d+)?)\s*%/i);
    if (!promoMatch) {
      throw new Error(`Could not find Flagstar Ready Savings promo APY. Block: "${blocks.readyPromo}"`);
    }
    const apy = parseFloat(promoMatch[1]);

    const promoBonus = `Ready Savings promo: ${apy.toFixed(2)}% APY on balances of $10,000+`;
    const keyTerms =
      "Special offer for new savings customers. Maximize earnings on balances of $10,000+ over the next 6 months. " +
      `$1 to open, $5/mo fee (waivable). Flagstar Performance Savings (${baseApy.toFixed(2)}% APY, $25,000+ balance, ` +
      "$15/mo fee, waivable) is the ongoing non-promotional alternative.";

    return {
      productName: "Ready Savings (promo tier)",
      apy,
      baseApy,
      minOpeningDeposit: 1,
      promoBonus,
      offerExpirationDate: null,
      keyTerms,
    };
  },
};
