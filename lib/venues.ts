import type { Address } from "viem";

export type QuoteToken = {
  address: Address;
  symbol: "WETH" | "USDG";
  decimals: number;
};

type BaseVenue = {
  id: string;
  label: string;
  factory: Address;
  quoteTokens: readonly QuoteToken[];
  sourceUrl: string;
};

export type V2Venue = BaseVenue & {
  version: "v2";
};

export type V3Venue = BaseVenue & {
  version: "v3";
  feeTiers: readonly number[];
};

export type Venue = V2Venue | V3Venue;

// Verified on Robinhood Chain Blockscout and against Uniswap's deployment docs.
export const QUOTE_TOKENS: readonly QuoteToken[] = [
  {
    address: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73",
    symbol: "WETH",
    decimals: 18,
  },
  {
    address: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
    symbol: "USDG",
    decimals: 6,
  },
];

export const VENUES: readonly Venue[] = [
  {
    id: "uniswap-v2",
    label: "Uniswap V2",
    version: "v2",
    factory: "0x8bcEaA40B9AcdfAedF85AdF4FF01F5Ad6517937f",
    quoteTokens: QUOTE_TOKENS,
    sourceUrl: "https://developers.uniswap.org/deployments",
  },
  {
    id: "uniswap-v3",
    label: "Uniswap V3",
    version: "v3",
    factory: "0x1f7d7550B1b028f7571E69A784071F0205FD2EfA",
    quoteTokens: QUOTE_TOKENS,
    feeTiers: [100, 500, 3_000, 10_000],
    sourceUrl:
      "https://developers.uniswap.org/docs/protocols/v3/deployments/v3-robinhood-chain-deployments",
  },
];
