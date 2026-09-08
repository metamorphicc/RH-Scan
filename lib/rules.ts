export type Verdict = "don't" | "thin" | "ok to size small";

export type RuleFlag = {
  code: string;
  label: string;
};

export type RuleSnapshot = {
  tokenAddress: string;
  flags: RuleFlag[];
};

export type RuleResult = {
  verdict: Verdict;
  flags: RuleFlag[];
};

export function evaluate(snapshot: RuleSnapshot): RuleResult {
  // TODO Stage 3: implement deterministic rules with fixtures, no ML/LLM.
  return {
    verdict: "thin",
    flags: snapshot.flags,
  };
}

