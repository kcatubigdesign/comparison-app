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
}

export type RateStatus = "verified" | "needs_review" | "failed";

// A single product's latest known snapshot. This is the shape the
// frontend renders directly, and the shape the crawler will produce
// once it exists (see /data/current/savings.json for now).
export interface ProductSnapshot {
  bankId: string;
  bankName: string;
  productName: string;
  apy: number;
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
