import type { BankAdapter } from "../core/types";

// E*TRADE's Premium Savings Account page (checked live on 2026-08-13)
// is the cleanest source yet — it states the promo rate, base rate,
// dollar bonus, expiration date, and even a promo code as plain
// sentences rather than requiring inference: "Earn a guaranteed 4.00%
// APY for 6 months, plus $400... Afterward, you'll earn our base
// rate, which is currently 3.50%... by 9/30/2026... Use promo code:
// SAVING26."
//
// Same glued-footnote-digit pattern as other banks (e.g. "$4002" is
// "$400" + a "2" footnote marker with zero separator) — the
// \d{1,3}(?:,\d{3})* currency shape naturally stops at 3 digits
// regardless, since {1,3} is a hard upper bound, so it self-limits
// without extra cleanup logic needed here.
//
// The promo code text actually differs between page loads ("SAVING26"
// vs "OFFER26" observed on two consecutive crawls) — E*TRADE appears
// to A/B test or personalize this banner. offerExpirationDate and
// promoCode are wrapped in try/catch and fall back to null rather
// than guessing, since the exact copy (including whether an
// expiration date is even mentioned) isn't guaranteed stable between
// runs. apy/baseApy come from more consistent, plainly-stated
// sentences and haven't shown this variability.
export const etradeAdapter: BankAdapter = {
  async extract(page) {
    const headline = page.getByText(/Earn a guaranteed \d+(?:\.\d+)?% APY for \d+ months/i).first();
    await headline.waitFor({ state: "attached", timeout: 15000 });
    const headlineText = (await headline.textContent()) ?? "";

    const apyMatch = headlineText.match(/guaranteed\s*(\d+(?:\.\d+)?)\s*%\s*APY/i);
    if (!apyMatch) {
      throw new Error(`Could not parse the promo APY out of headline text: "${headlineText}"`);
    }
    const apy = parseFloat(apyMatch[1]);

    const bonusMatch = headlineText.match(/(\$\d{1,3}(?:,\d{3})*)/);
    const bonusAmount = bonusMatch ? bonusMatch[1] : null;

    // The base-rate number is sometimes not yet populated when this
    // sentence first renders — seen once as a literal "—" placeholder
    // ("...currently —9X the national average") that fills in an
    // instant later. A few short retries are cheap insurance against
    // that render race, rather than failing the whole crawl on a
    // timing fluke.
    const baseRateEl = page.getByText(/base rate, which is currently/i).first();
    let baseApy: number | null = null;
    let lastBaseRateText = "";
    for (let attempt = 0; attempt < 4 && baseApy === null; attempt++) {
      if (attempt > 0) await page.waitForTimeout(750);
      lastBaseRateText = (await baseRateEl.textContent({ timeout: 3000 })) ?? "";
      const baseMatch = lastBaseRateText.match(/base rate, which is currently\s*(\d+(?:\.\d+)?)\s*%/i);
      if (baseMatch) baseApy = parseFloat(baseMatch[1]);
    }
    if (baseApy === null) {
      throw new Error(`Could not parse the base APY out of text after retries: "${lastBaseRateText}"`);
    }

    let offerExpirationDate: string | null = null;
    try {
      const expireEl = page.getByText(/qualifying deposits by/i).first();
      const expireText = (await expireEl.textContent({ timeout: 3000 })) ?? "";
      const dateMatch = expireText.match(/by\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (dateMatch) {
        const [, month, day, year] = dateMatch;
        offerExpirationDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      }
    } catch {
      offerExpirationDate = null;
    }

    let promoCode: string | null = null;
    try {
      const codeEl = page.getByText(/Use promo code/i).first();
      const codeText = (await codeEl.textContent({ timeout: 3000 })) ?? "";
      const codeMatch = codeText.match(/Use promo code:\s*(\S+)/i);
      promoCode = codeMatch ? codeMatch[1] : null;
    } catch {
      promoCode = null;
    }

    const promoBonus = [
      bonusAmount ? `${bonusAmount} cash bonus` : null,
      `${apy.toFixed(2)}% APY for 6 months`,
    ]
      .filter(Boolean)
      .join(" + ");

    const keyTerms = [
      `Guaranteed ${apy.toFixed(2)}% APY for 6 months`,
      bonusAmount ? `plus a ${bonusAmount} cash bonus` : null,
      `on a new Premium Savings Account. Reverts to the base rate (currently ${baseApy.toFixed(2)}%) afterward.`,
      promoCode ? `Promo code: ${promoCode}.` : null,
    ]
      .filter(Boolean)
      .join(" ");

    return {
      productName: "Premium Savings Account",
      apy,
      baseApy,
      minOpeningDeposit: 0,
      promoBonus,
      offerExpirationDate,
      keyTerms,
    };
  },
};
