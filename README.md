# rhcheck

rhcheck is a read-only Robinhood Chain contract review surface. Paste an EVM token address and it records a point-in-time snapshot of common contract controls, verified Uniswap liquidity, local deployer history, Blockscout metadata, and official Robinhood Stock Token identity.

The output is deterministic and evidence-led. Every caution links back to a plain rule, unavailable data stays unknown, and official asset identity is displayed separately from the contract-risk verdict.

## What It Does

- Reads known ERC-20, Ownable, Ownable2Step, AccessControl, pause, freeze, blacklist, fee-wallet, and EIP-1967 proxy surfaces.
- Searches verified Uniswap V2 and V3 factories for WETH and USDG pools, then reports the deepest comparable pool found.
- Distinguishes an absent pool from an incomplete factory read.
- Discovers contract creator and verification metadata through Robinhood Chain Blockscout.
- Matches chain ID `4663` deployments against Robinhood's official Stock Token assets API.
- Applies local deterministic rules with three possible verdicts: `don't`, `thin`, and `ok to size small`.
- Stores snapshots, deployer-token relationships, and hashed-IP rate-limit buckets in SQLite.
- Shows source provenance, snapshot changes, responsive OG images, and a health endpoint.

## What It Does Not Do

- No wallet connection or signer.
- No transaction construction or submission.
- No swap, route, quote-to-buy flow, or buy button.
- No LLM scoring or hidden model judgment.
- No arbitrary contract execution; reads are limited to known view ABIs and EIP-1967 storage slots.
- No promise about future token behavior. A snapshot can be incomplete or become stale after it is recorded.
- No price recommendation. Official Stock Token registry identity does not alter the contract-risk verdict.

## Run Locally

Requirements: Node.js `20.9+` and Corepack. The public Robinhood Chain RPC is configured by default, so local development does not require an API key.

```powershell
corepack enable
corepack pnpm install --frozen-lockfile
Copy-Item .env.example .env.local
corepack pnpm dev
```

Open `http://localhost:3000` and paste a token contract address.

If `pnpm` is not available as a standalone command, keep the `corepack pnpm ...` prefix shown above. For production traffic, replace the public RPC URL with a dedicated Robinhood Chain provider endpoint.

## Environment

```dotenv
RH_RPC_URL=https://rpc.mainnet.chain.robinhood.com
RH_CHAIN_ID=4663
RH_EXPLORER_API_URL=https://robinhoodchain.blockscout.com/api/v2
RH_ASSETS_API_URL=https://api.robinhood.com/rhj/assets
RHCHECK_DB_PATH=./data/rhcheck.sqlite
RHCHECK_ENABLE_DEBUG_API=false
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`RH_RPC_URL` and `RH_CHAIN_ID` fall back to the official public mainnet values. `RH_EXPLORER_API_URL`, `RH_ASSETS_API_URL`, and `RHCHECK_DB_PATH` also have built-in defaults. None of these values is a secret.

Set `RHCHECK_ENABLE_DEBUG_API=true` only when the temporary `/api/rights` and `/api/pool` inspection routes should be exposed in production. They are available automatically in local development.

## Commands

```powershell
corepack pnpm typecheck
corepack pnpm test
corepack pnpm test:e2e
corepack pnpm build
corepack pnpm verify
```

Install Playwright's Chromium binary once before the browser suite:

```powershell
corepack pnpm exec playwright install chromium
```

`pnpm test` runs deterministic unit tests. The Playwright suite covers input validation, failure recovery, API headers, responsive layout, and the complete mocked result flow at mobile, tablet, and desktop widths.

## API Surface

- `GET /api/check?token=0x...` performs a check, rate-limits it, and stores a snapshot.
- `GET /api/history?token=0x...&limit=5` returns recent snapshots and field-level changes.
- `GET /api/og?token=0x...` renders the latest stored verdict without triggering RPC work.
- `GET /api/health` checks database and runtime configuration readiness without making an RPC call.
- `GET /api/rights` and `GET /api/pool` are debug-only routes.

The check cache lasts 45 seconds per token/deployer pair. The persistent request limit is 60 requests per minute per hashed client address.

## Deployment

rhcheck needs a long-running Node.js runtime and a persistent writable volume for SQLite. Do not rely on an ephemeral serverless filesystem if snapshot history matters.

```powershell
docker build -t rhcheck .
docker run --rm -p 3000:3000 -v rhcheck-data:/app/data rhcheck
```

Set `NEXT_PUBLIC_SITE_URL` to the public HTTPS origin before building production metadata. Mount `/app/data` or point `RHCHECK_DB_PATH` at another persistent path.

## Design Boundaries

The canonical product rules are documented in [rules.md](./rules.md). Architecture and data-flow notes live in [docs/architecture.md](./docs/architecture.md). The original scoped build plan remains in [rhcheck-mvp.md](./rhcheck-mvp.md) as historical context, not current setup documentation.
