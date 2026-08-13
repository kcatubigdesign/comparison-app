import type { BankAdapter } from "../core/types";

// Marcus's savings page (checked live on 2026-08-13) renders the hero
// APY in a <span class="font-size__46px"> containing "3.40% APY".
// The page has duplicate copies of this element in the DOM (looks
// like a responsive-breakpoint variant that's hidden via CSS rather
// than removed), so we filter by content instead of requiring
// visibility — waiting for "visible" would risk timing out if
// Playwright happens to grab the hidden copy first.
export const marcusAdapter: BankAdapter = {
  async extract(page) {
    const rateEl = page.locator("span.font-size__46px", { hasText: /APY/i }).first();
    await rateEl.waitFor({ state: "attached", timeout: 15000 });
    const rateText = (await rateEl.textContent()) ?? "";
    const apyMatch = rateText.match(/(\d+(?:\.\d+)?)/);
    if (!apyMatch) {
      throw new Error(`Could not parse an APY number out of rate element text: "${rateText}"`);
    }
    const apy = parseFloat(apyMatch[1]);

    // A page-wide getByText() here actually pulled in an unrelated
    // sibling bullet's text too ("Annual Percentage Yield." got
    // prepended) — Playwright's text matching walked up to a shared
    // ancestor instead of stopping at the leaf. Scoping to the
    // specific wrapper class first avoids that.
    let keyTerms: string | null = null;
    try {
      const feeText = page.locator(".custom-image-list--lrg", { hasText: /No fees/i }).first();
      keyTerms = ((await feeText.textContent({ timeout: 3000 })) ?? "").trim() || null;
    } catch {
      keyTerms = null;
    }

    // Derived from the extracted copy itself, not hardcoded — if the
    // page's own wording changes, this stops applying rather than
    // silently staying wrong.
    const minOpeningDeposit = keyTerms && /no minimum deposit/i.test(keyTerms) ? 0 : null;

    return {
      productName: "Online Savings Account",
      apy,
      minOpeningDeposit,
      keyTerms: keyTerms ?? "Not extracted — see source",
    };
  },
};
