# Architecture

rhcheck is deliberately a small read-only system. It has no wallet client, signer, transaction builder, or model-based score.

```text
browser
  -> /api/check
      -> Robinhood Chain RPC: known view calls, storage slots, pool factories
      -> Blockscout API: creator, verification, proxy metadata
      -> Robinhood assets API: canonical Stock Token identity
      -> deterministic rules
      -> SQLite snapshot + deployer history
  -> /api/history
      -> SQLite snapshot diff
```

## Trust Boundaries

- RPC, Blockscout, and Robinhood REST responses are external observations. A failed source becomes `unknown`; it is not converted into a positive claim.
- Contract metadata such as name and symbol is untrusted display data. Canonical Stock Token identity requires a chain-and-address match in Robinhood's official registry.
- The rule engine consumes typed facts and has no network access.
- The browser receives facts, provenance, flags, and the verdict. It does not recompute the verdict.
- SQLite is local application state. Deployer history describes only what this installation has observed.

## Runtime Flow

1. Normalize the requested EVM address with viem.
2. Serve a 45-second cached result or join an identical in-flight check.
3. Read Blockscout and Robinhood registry metadata concurrently.
4. Read rights, pool candidates, block number, and prior deployer facts concurrently.
5. Select the deepest readable pool using quote-specific reserve baselines.
6. Record the deployer-token relationship before evaluating the snapshot.
7. Run deterministic rules and persist the complete evidence payload.
8. Return the result with rate-limit and no-store headers.

## Persistence

SQLite uses WAL mode and contains four logical datasets:

- `snapshots`: immutable check observations and rule output.
- `deployers`: aggregate local deployer counts.
- `deployer_tokens`: idempotent deployer-to-token observations and dead state.
- `rate_limits`: expiring hashed-client request buckets.

The deployment must provide a persistent writable path. The default is `./data/rhcheck.sqlite`.

## Deliberate Limits

- Known ABI reads cannot discover every custom authority pattern.
- V3 token balances are a reserve approximation and do not model active in-range liquidity.
- Pool age remains unknown until a reliable creation-time observation is available, so it produces a caution.
- Pool discovery covers only the verified venues and quote assets in `lib/venues.ts`.
- The health endpoint checks local readiness, not upstream RPC availability.
- A result is a timestamped observation, not continuous monitoring.
