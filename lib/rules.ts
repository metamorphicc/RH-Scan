export type Verdict = "don't" | "thin" | "ok to size small";

export type FactStatus = "present" | "absent" | "unknown";

export type RuleFlag = {
  code: string;
  label: string;
  severity: "critical" | "caution";
};

export type RuleSnapshot = {
  tokenAddress: string;
  authorities: {
    mint: FactStatus;
    freeze: FactStatus;
    owner: FactStatus;
    feeWallet: FactStatus;
  };
  pool: {
    status: FactStatus;
    deployerShare: number | null;
    reserveQuote: string | null;
    quoteSymbol: string | null;
    ageMinutes: number | null;
  };
  deployer: {
    tokensSeen: number | null;
    deadCount: number | null;
  };
};

export type RuleResult = {
  verdict: Verdict;
  flags: RuleFlag[];
};

export const RULE_THRESHOLDS = {
  thinPoolReserveQuote: {
    USDG: 1_000_000_000n,
    WETH: 500_000_000_000_000_000n,
  },
  newDeployerTokensSeen: 0,
  serialDeadDeployerCount: 3,
  deployerControlsPoolPercent: 50,
  freshPoolAgeMinutes: 30,
} as const;

export function evaluate(snapshot: RuleSnapshot): RuleResult {
  const flags = collectRuleFlags(snapshot);

  if (hasAnyFlag(flags, "critical")) {
    return {
      verdict: "don't",
      flags,
    };
  }

  if (hasAnyFlag(flags, "thin")) {
    return {
      verdict: "thin",
      flags,
    };
  }

  return {
    verdict: "ok to size small",
    flags,
  };
}

function collectRuleFlags(snapshot: RuleSnapshot): RuleFlag[] {
  return [
    ...authorityFlags(snapshot),
    ...poolFlags(snapshot),
    ...deployerFlags(snapshot),
  ];
}

function authorityFlags(snapshot: RuleSnapshot): RuleFlag[] {
  const flags: RuleFlag[] = [];

  if (snapshot.authorities.mint === "present") {
    flags.push(critical("mint-present", "Mint authority is still present."));
  }

  if (snapshot.authorities.freeze === "present") {
    flags.push(critical("freeze-present", "Freeze authority is still present."));
  }

  if (
    snapshot.authorities.owner === "present" &&
    snapshot.authorities.feeWallet === "present"
  ) {
    flags.push(
      critical(
        "owner-fee-control",
        "Owner and fee wallet controls are both present.",
      ),
    );
  }

  for (const [key, value] of Object.entries(snapshot.authorities)) {
    if (value === "unknown") {
      flags.push(thin(`${key}-unknown`, `${key} authority is unknown.`));
    }
  }

  return flags;
}

function poolFlags(snapshot: RuleSnapshot): RuleFlag[] {
  const flags: RuleFlag[] = [];

  if (snapshot.pool.status === "absent") {
    flags.push(critical("pool-absent", "No pool was found."));
  }

  if (snapshot.pool.status === "unknown") {
    flags.push(thin("pool-unknown", "Pool status is unknown."));
  }

  if (
    snapshot.pool.deployerShare !== null &&
    snapshot.pool.deployerShare >= RULE_THRESHOLDS.deployerControlsPoolPercent
  ) {
    flags.push(
      critical(
        "pool-deployer-control",
        "Deployer appears to control a large LP share.",
      ),
    );
  }

  if (
    snapshot.pool.reserveQuote !== null &&
    snapshot.pool.quoteSymbol !== null &&
    isKnownQuoteSymbol(snapshot.pool.quoteSymbol) &&
    parseWholeUnits(snapshot.pool.reserveQuote) <
      RULE_THRESHOLDS.thinPoolReserveQuote[snapshot.pool.quoteSymbol]
  ) {
    flags.push(thin("pool-thin", "Pool quote reserves are thin."));
  }

  if (
    snapshot.pool.status === "present" &&
    (!snapshot.pool.quoteSymbol || !isKnownQuoteSymbol(snapshot.pool.quoteSymbol))
  ) {
    flags.push(thin("pool-quote-unknown", "Pool quote asset is unknown."));
  }

  if (
    snapshot.pool.ageMinutes !== null &&
    snapshot.pool.ageMinutes <= RULE_THRESHOLDS.freshPoolAgeMinutes
  ) {
    flags.push(thin("pool-fresh", "Pool is very new."));
  }

  return flags;
}

function deployerFlags(snapshot: RuleSnapshot): RuleFlag[] {
  const flags: RuleFlag[] = [];

  if (
    snapshot.deployer.deadCount !== null &&
    snapshot.deployer.deadCount >= RULE_THRESHOLDS.serialDeadDeployerCount
  ) {
    flags.push(
      critical(
        "deployer-serial-dead",
        "Deployer has multiple dead tokens in local history.",
      ),
    );
  }

  if (snapshot.deployer.tokensSeen === null) {
    flags.push(thin("deployer-unknown", "Deployer history is unknown."));
  } else if (snapshot.deployer.tokensSeen <= RULE_THRESHOLDS.newDeployerTokensSeen) {
    flags.push(thin("deployer-new", "Deployer has no local history."));
  }

  return flags;
}

function critical(code: string, label: string): RuleFlag {
  return {
    code,
    label,
    severity: "critical",
  };
}

function thin(code: string, label: string): RuleFlag {
  return {
    code,
    label,
    severity: "caution",
  };
}

function hasAnyFlag(flags: RuleFlag[], kind: "critical" | "thin"): boolean {
  if (kind === "critical") {
    return flags.some((flag) => flag.severity === "critical");
  }

  return flags.some((flag) => flag.severity === "caution");
}

function parseWholeUnits(value: string): bigint {
  try {
    return BigInt(value);
  } catch {
    return 0n;
  }
}

function isKnownQuoteSymbol(
  value: string,
): value is keyof typeof RULE_THRESHOLDS.thinPoolReserveQuote {
  return value === "USDG" || value === "WETH";
}
