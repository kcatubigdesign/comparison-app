import type { BankAdapter } from "../core/types";

// Wealthfront's Cash page (checked live on 2026-08-13) repeats its
// APY figures inside a custom SVG infographic (32 separate <tspan>
// elements, no stable structure to anchor to) — too fragile to scrape
// reliably. Two better, plain-DOM sources exist instead:
// - The page's one and only <h1> reads "Earn up to 4.20% APY" — the
//   top rate (base + both stackable boosts), used as `apy`.
// - A footnote sentence gives the true base rate on its own
//   ("3.30% Base Annual Percentage Yield (APY) as of..."), used as
//   `baseApy`.
//
// Wealthfront's new-client boost is duration-based (3 months from
// account opening), not a fixed calendar date like Barclays/
// Betterment's — offerExpirationDate is left null since there's no
// absolute date to report; the duration is described in the text.
export const wealthfrontAdapter: BankAdapter = {
  async extract(page) {
    const heading = page.locator("h1").first();
    await heading.waitFor({ state: "attached", timeout: 15000 });
    const headingText = (await heading.textContent()) ?? "";
    const apyMatch = headingText.match(/(\d+(?:\.\d+)?)\s*%\s*APY/i);
    if (!apyMatch) {
      throw new Error(`Could not parse a top APY number out of the page heading: "${headingText}"`);
    }
    const apy = parseFloat(apyMatch[1]);

    const footnote = page.getByText(/Base Annual Percentage Yield/i).first();
    await footnote.waitFor({ state: "attached", timeout: 15000 });
    const footnoteText = (await footnote.textContent()) ?? "";
    const baseApyMatch = footnoteText.match(/(\d+(?:\.\d+)?)\s*%\s*Base/i);
    if (!baseApyMatch) {
      throw new Error(`Could not parse a base APY number out of footnote text: "${footnoteText}"`);
    }
    const baseApy = parseFloat(baseApyMatch[1]);

    let promoBonus: string | null = null;
    let keyTerms: string | null = null;
    try {
      const bonusEl = page.getByText(/New clients earn/i).first();
      const bonusText = ((await bonusEl.textContent({ timeout: 3000 })) ?? "").replace(/\s+/g, " ").trim();
      keyTerms = bonusText || null;
      const headlineMatch = bonusText.match(/(\d+(?:\.\d+)?%\s*APY\s*boost\s*for\s*\d+\s*months?\s*on\s*up\s*to\s*\$[\d,]+)/i);
      promoBonus = headlineMatch ? headlineMatch[1] : bonusText || null;
    } catch {
      // no active promo — not an error, just nothing to report
    }

    return {
      productName: "Cash Account",
      apy,
      baseApy,
      promoBonus,
      offerExpirationDate: null,
      keyTerms: keyTerms ?? "Not extracted — see source",
    };
  },
};
