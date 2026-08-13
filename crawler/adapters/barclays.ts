import type { BankAdapter } from "../core/types";

// Barclays' originally-configured URL (banking.barclaysus.com) now
// redirects to a homepage listing three different savings products
// (Tiered Savings, Online Savings, Online CDs) rather than a single
// product page. Rather than parse ambiguity out of a multi-product
// homepage, we point directly at the dedicated Tiered Savings page
// (linked from that homepage's own "Get the details" CTA) — it's the
// product Barclays is actually promoting front and center, and it
// includes a real, current promo bonus with an expiration date, which
// none of our other adapters have hit yet.
//
// The hero uses an AEM "teaser" component (.cmp-teaser__title) whose
// text combines the product name, APY, and bonus headline into one
// element separated by <br> tags — parsed apart with regex rather
// than separate selectors, since that's how the markup actually
// groups them.
export const barclaysAdapter: BankAdapter = {
  async extract(page) {
    const titleEl = page.locator(".cmp-teaser__title").first();
    await titleEl.waitFor({ state: "attached", timeout: 15000 });
    const titleText = (await titleEl.textContent()) ?? "";

    const apyMatch = titleText.match(/(\d+(?:\.\d+)?)\s*%\s*APY/i);
    if (!apyMatch) {
      throw new Error(`Could not parse an APY number out of teaser title text: "${titleText}"`);
    }
    const apy = parseFloat(apyMatch[1]);

    // The source HTML has a footnote marker (<sup>2</sup>) glued
    // directly onto "$25,000" with zero separating characters — not
    // even whitespace — so there's no boundary a generic [\d,]+ class
    // can detect to stop at. \d{1,3}(?:,\d{3})* matches the actual
    // shape of a comma-grouped dollar amount instead, which excludes
    // the stray "2" because it isn't preceded by a comma.
    const money = String.raw`\$\d{1,3}(?:,\d{3})*`;
    const bonusMatch = titleText.match(new RegExp(`(${money}\\s*Bonus\\s+after\\s+depositing\\s+${money})`, "i"));
    const promoBonus = bonusMatch ? bonusMatch[1].replace(/\s+/g, " ").trim() : null;

    let offerExpirationDate: string | null = null;
    try {
      const descText = (await page.locator(".cmp-teaser__description").first().textContent({ timeout: 3000 })) ?? "";
      const expireMatch = descText.match(/Offer expires\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
      if (expireMatch) {
        const [, month, day, year] = expireMatch;
        offerExpirationDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      }
    } catch {
      offerExpirationDate = null;
    }

    // When there's a promo bonus, Key Terms should explain *that*
    // (what a user actually needs to know to qualify) rather than
    // generic no-fee copy — there's a separate, plain-English bonus
    // explainer paragraph on the page for exactly this. Falls back to
    // the general fee/minimum copy when there's no bonus to explain.
    let keyTerms: string | null = null;
    if (promoBonus) {
      try {
        // Matches the "Bonus. Here's how:" phrasing pattern rather
        // than the specific "$200" amount, so this keeps working if
        // Barclays changes the offer size without changing the copy
        // template.
        const bonusExplainer = page.locator(".cmp-title__text p", { hasText: /Bonus\.\s*Here's how/i }).first();
        const raw = (await bonusExplainer.textContent({ timeout: 3000 })) ?? "";
        // Strips a footnote marker digit glued directly onto the end
        // with no separating space (e.g. "...for 120 days.2").
        keyTerms = raw.replace(/\.(\d)$/, ".").trim() || null;
      } catch {
        keyTerms = null;
      }
    }
    if (!keyTerms) {
      try {
        const feeText = page
          .getByText(/no monthly maintenance or annual fees charged for Barclays accounts/i)
          .first();
        keyTerms = ((await feeText.textContent({ timeout: 3000 })) ?? "").trim() || null;
      } catch {
        keyTerms = null;
      }
    }

    return {
      productName: "Tiered Savings",
      apy,
      promoBonus,
      offerExpirationDate,
      keyTerms: keyTerms ?? "Not extracted — see source",
    };
  },
};
