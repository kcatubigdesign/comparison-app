import type { Page } from "playwright";
import type { BankConfig, ProductSnapshot } from "../../src/lib/types";

// What an adapter is responsible for producing. Fields an adapter
// can't confidently extract should be omitted (they default to null)
// rather than guessed — better to under-report than publish a wrong
// number for financial data.
export type ExtractedFields = Pick<ProductSnapshot, "productName" | "apy"> &
  Partial<
    Pick<
      ProductSnapshot,
      | "baseApy"
      | "interestRate"
      | "minOpeningDeposit"
      | "minBalance"
      | "promoBonus"
      | "offerExpirationDate"
      | "keyTerms"
    >
  >;

export interface BankAdapter {
  extract(page: Page, bank: BankConfig): Promise<ExtractedFields>;
}

export interface CrawlLogEntry {
  bankId: string;
  startedAt: string;
  finishedAt: string;
  outcome: "success" | "no_adapter" | "extraction_failed";
  message: string | null;
}
