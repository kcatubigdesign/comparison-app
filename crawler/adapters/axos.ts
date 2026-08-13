import type { BankAdapter } from "../core/types";

// Axos Bank's savings page (checked live on 2026-08-13) has two tabs —
// "Axos ONE" (a checking + savings bundle, up to 4.21% APY on the
// savings side) and "Summit Savings" (a plain standalone account, no
// minimums, 3.75% APY) — and both tab panels are present in the DOM
// simultaneously (one just CSS-hidden), so no click/tab-switch is
// needed to read both.
//
// apy = Axos ONE's savings rate (the top rate available, bundle
// required). baseApy = Summit Savings (the ongoing rate with no
// bundling requirement) — same "top vs ongoing" split as Flagstar,
// just across two differently-named products rather than tiers of one.
export const axosAdapter: BankAdapter = {
  async extract(page) {
    const blocks = await page.evaluate(() => ({
      axosOne:
        Array.from(document.querySelectorAll("div"))
          .filter((d) => d.textContent?.includes("Axos ONE") && d.textContent?.includes("Earn up to") && d.textContent?.includes("APY"))
          .sort((a, b) => (a.textContent?.length ?? 0) - (b.textContent?.length ?? 0))[0]?.textContent ?? null,
      summit:
        Array.from(document.querySelectorAll("div"))
          .filter((d) => d.textContent?.includes("Summit Savings") && d.textContent?.includes("Simple, high-yield") && d.textContent?.includes("APY"))
          .sort((a, b) => (a.textContent?.length ?? 0) - (b.textContent?.length ?? 0))[0]?.textContent ?? null,
    }));

    const apyMatch = blocks.axosOne?.match(/Earn up to\s*(\d+(?:\.\d+)?)\s*%\s*APY/i);
    if (!apyMatch) {
      throw new Error(`Could not find Axos ONE savings APY. Block: "${blocks.axosOne}"`);
    }
    const apy = parseFloat(apyMatch[1]);

    const baseMatch = blocks.summit?.match(/(\d+(?:\.\d+)?)\s*%\s*APY/i);
    if (!baseMatch) {
      throw new Error(`Could not find Summit Savings APY. Block: "${blocks.summit}"`);
    }
    const baseApy = parseFloat(baseMatch[1]);

    return {
      productName: "Axos ONE Savings",
      apy,
      baseApy,
      minOpeningDeposit: 0,
      promoBonus: `Axos ONE bundle: up to ${apy.toFixed(2)}% APY on savings (requires linked Axos ONE Checking)`,
      offerExpirationDate: null,
      keyTerms:
        "Axos ONE is a checking + savings bundle — no monthly maintenance, balance, opening, or overdraft fees. " +
        `The standalone Summit Savings account (no bundle required) earns ${baseApy.toFixed(2)}% APY with no minimum balance or initial deposit.`,
    };
  },
};
