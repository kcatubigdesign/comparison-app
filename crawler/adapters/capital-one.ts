import type { BankAdapter } from "../core/types";

// Capital One's savings page (checked live on 2026-08-13) uses a
// custom <rates-inline> web component wherever it displays a live
// rate figure — it appears twice (hero heading, footer disclosure
// text), so we take the first. Being a purpose-built custom element
// rather than a styling class, this is about as stable a hook as a
// scraper can ask for.
//
// Note: as of this check, Discover Bank's savings page redirects
// entirely to this same Capital One product ("Discover is now part
// of Capital One"). Discover is deactivated in banks.json rather than
// crawled separately — see the note field there.
export const capitalOneAdapter: BankAdapter = {
  async extract(page) {
    const rateEl = page.locator("rates-inline").first();
    await rateEl.waitFor({ state: "attached", timeout: 15000 });
    const rateText = (await rateEl.textContent()) ?? "";
    const apyMatch = rateText.match(/(\d+(?:\.\d+)?)/);
    if (!apyMatch) {
      throw new Error(`Could not parse an APY number out of rate element text: "${rateText}"`);
    }
    const apy = parseFloat(apyMatch[1]);

    async function cardSubheadline(headingText: string): Promise<string | null> {
      try {
        const card = page.locator("div.product", { has: page.locator("h3", { hasText: headingText }) }).first();
        const text = await card.locator("p.subheadline").first().textContent({ timeout: 3000 });
        return text?.trim() || null;
      } catch {
        return null;
      }
    }

    const feeText = await cardSubheadline("No fees");
    const minText = await cardSubheadline("No minimums");
    const keyTerms = [feeText, minText].filter(Boolean).join(" ") || "Not extracted — see source";

    return {
      productName: "360 Performance Savings",
      apy,
      minOpeningDeposit: minText && /no minimum/i.test(minText) ? 0 : null,
      keyTerms,
    };
  },
};
