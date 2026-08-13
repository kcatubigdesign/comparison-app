import type { BankAdapter } from "../core/types";

// Ally's savings page (checked live on 2026-08-12) renders the hero
// APY as a <p> immediately followed by a sibling <div> whose class
// contains "Rate_rateDescription" and reads "Annual Percentage
// Yield...". We anchor to that sibling relationship + the stable
// part of the class name rather than the full hashed class
// (e.g. "Rate_rateValue__PO9Bh") — the hash suffix is CSS-module
// build output and will change on Ally's next frontend deploy even
// if nothing about the page actually changes.
export const allyAdapter: BankAdapter = {
  async extract(page) {
    const description = page.locator('div[class*="Rate_rateDescription"]').first();
    await description.waitFor({ state: "visible", timeout: 15000 });

    const rateEl = description.locator("xpath=preceding-sibling::p[1]");
    const rateText = (await rateEl.textContent()) ?? "";
    const apyMatch = rateText.match(/(\d+(?:\.\d+)?)/);
    if (!apyMatch) {
      throw new Error(`Could not parse an APY number out of rate element text: "${rateText}"`);
    }
    const apy = parseFloat(apyMatch[1]);

    // Deliberately the *full* sentence, not a short substring like
    // "no monthly maintenance fees" — that shorter phrase also
    // appears inside an unrelated marketing paragraph earlier on the
    // page and matched there first, pulling in a paragraph of noise.
    let keyTerms: string | null = null;
    try {
      const feeText = page.getByText(/no monthly maintenance fees or minimum balance requirements/i).first();
      keyTerms = ((await feeText.textContent({ timeout: 3000 })) ?? "").trim() || null;
    } catch {
      keyTerms = null;
    }

    return {
      productName: "Savings Account",
      apy,
      // Not shown as a distinct figure on this page — only APY is
      // published, same as our sample data's null convention.
      interestRate: null,
      // Stated in page copy ("no monthly maintenance fees or minimum
      // balance requirements") but not extracted from a dedicated
      // selector yet, so we leave it unset rather than hardcode it.
      minOpeningDeposit: null,
      minBalance: null,
      keyTerms: keyTerms ?? "Not extracted — see source",
    };
  },
};
