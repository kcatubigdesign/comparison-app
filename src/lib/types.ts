// Bank configuration — read by the (future) crawler to know which
// banks to visit and which extraction adapter to use. Kept separate
// from presentation data (colors, etc.) so this file stays something
// the crawler can own without frontend concerns leaking in.
export interface BankConfig {
  id: string;
  name: string;
  active: boolean;
  savingsUrl: string;
  adapterId: string;
  /** Why a bank is inactive, when it's not simply "not built yet". */
  note?: string;
}

export type RateStatus = "verified" | "needs_review" | "failed";

// A single product's latest known snapshot. This is the shape the
// frontend renders directly, and the shape the crawler will produce
// once it exists (see /data/current/savings.json for now).
export interface ProductSnapshot {
  bankId: string;
  bankName: string;
  productName: string;
  /**
   * The top rate a customer can actually get at this bank right now —
   * "showcase the top rates, no matter what product." This may
   * include a promotional boost (e.g. a new-customer rate bump or a
   * higher-balance product at the same brand). Comparisons/sorting
   * use this field.
   */
  apy: number;
  /**
   * The ongoing rate with no promotional boost applied — what you
   * actually keep earning after any promo period ends, or the best
   * standing (non-teaser) rate at this bank. Equal to `apy` when
   * there's no boost to distinguish. Always show both when they
   * differ, so a temporary teaser rate never gets mistaken for a
   * durable one.
   */
  baseApy: number;
  interestRate: number | null;
  minOpeningDeposit: number | null;
  minBalance: number | null;
  promoBonus: string | null;
  offerExpirationDate: string | null;
  keyTerms: string;
  sourceUrl: string;
  lastCheckedAt: string;
  status: RateStatus;
  /** Small series of recent APY readings, oldest first, used for the sparkline. */
  recentApyTrend: number[];
}
