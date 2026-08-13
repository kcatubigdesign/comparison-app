import type { BankAdapter } from "../core/types";
import { allyAdapter } from "./ally";
import { marcusAdapter } from "./marcus";

// Registry the engine looks up by `adapterId` from data/banks.json.
// Adding a new bank is: write crawler/adapters/{id}.ts, register it
// here, flip `active: true` in banks.json — the engine itself never
// needs to change.
export const adapters: Record<string, BankAdapter> = {
  ally: allyAdapter,
  marcus: marcusAdapter,
};
