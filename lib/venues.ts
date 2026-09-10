import type { Address } from "viem";

export type V2Venue = {
  id: string;
  label: string;
  factory: Address;
  quoteTokens: Address[];
};

export const V2_VENUES: V2Venue[] = [
  // TODO Stage 2: fill with verified Robinhood Chain V2 factory addresses.
  // Do not invent addresses. Add only venues confirmed from RH docs/explorer.
];

