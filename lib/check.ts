import type { RuleResult } from "./rules";

export type CheckResult = RuleResult & {
  tokenAddress: string;
  block: number | null;
  timestamp: string | null;
  facts: string[];
};

export async function checkToken(tokenAddress: string): Promise<CheckResult> {
  // TODO Stage 4: combine flags, pool data, deployer stats, rules, and storage.
  return {
    tokenAddress,
    block: null,
    timestamp: null,
    verdict: "thin",
    flags: [],
    facts: [],
  };
}

