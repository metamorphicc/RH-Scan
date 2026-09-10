# rhcheck Rules

The rules are deterministic and local. They do not use ML, LLM scoring, price charts, swaps, wallet signatures, or arbitrary token bytecode execution.

Every result returns one verdict and the rule flags that caused it. Unknown data is not treated as a positive signal.

## Verdicts

`don't` is returned when any critical rule fires.

Critical rules:

- Mint authority is present.
- Freeze authority is present.
- Owner and fee wallet controls are both present.
- No pool is found.
- Deployer appears to control at least 50% of LP supply.
- Local history shows at least 3 dead tokens for the deployer.

`thin` is returned when no critical rule fires, but any caution rule fires.

Caution rules:

- Any critical authority field is unknown.
- Pool status is unknown.
- Quote reserves are below the local thin-pool threshold.
- Pool age is 30 minutes or less.
- Deployer history is unknown.
- Deployer has no local history.

`ok to size small` is returned only when:

- Mint, freeze, owner, and fee wallet checks are known.
- Dangerous authorities are absent.
- A pool is present.
- Quote reserves are not thin.
- Pool age is not fresh.
- Deployer is not a serial dead-token deployer.
- No critical data is unknown.

## Local Thresholds

- Thin quote reserve threshold: `1000` whole quote units.
- Fresh pool threshold: `30` minutes.
- Deployer LP control threshold: `50%`.
- Serial dead deployer threshold: `3` dead tokens.

These values are placeholders for v0.1 fixtures and can be revised with QA evidence.

