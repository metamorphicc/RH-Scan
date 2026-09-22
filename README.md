# rhcheck

rhcheck is a TypeScript Next.js App Router project for a read-only Robinhood Chain token check page.

This repository currently includes Stages 0-8. It provides the app skeleton, an address input on the home page, a token result page at `/t/[address]`, environment variable examples, temporary debug APIs for rights and pool reads, deterministic offline verdict rules, an end-to-end check API, OG images, a rough in-memory rate limit, a live-address QA list, and snapshot history JSON.

## What It Is

- A read-only token check interface for Robinhood Chain.
- A result page that routes an entered address to `/t/[address]` and displays the latest check result.
- A temporary `GET /api/rights?token=0x...` endpoint that reads known view methods with `eth_call`.
- A temporary `GET /api/pool?token=0x...` endpoint that reads verified Uniswap V2 and V3 pools against WETH and USDG.
- A `GET /api/check?token=0x...` endpoint that combines rights, pool facts, deployer stats, rules, caching, and snapshot storage.
- A `GET /api/og?token=0x...` image endpoint for link previews.
- A `GET /api/history?token=0x...` endpoint that returns previous snapshots for one token.
- A rough per-IP in-memory rate limit on `/api/check`.
- A Stage 7 QA list at `qa/addresses.md` with 20 Robinhood Chain token addresses and 5 explorer spot checks.
- Offline deterministic rules that can produce `don't`, `thin`, or `ok to size small`.

## What It Is Not

- No wallet connection.
- No signer.
- No swap flow.
- No buy button.
- No LLM scoring.
- No wallet actions, alerts, or payments.
- No invented DEX/factory addresses; venue configuration is sourced from official Uniswap deployment documentation and checked on Robinhood Chain Blockscout.
- No history UI, alerts, or payments.
- No guarantee language about token outcomes.

## Environment

Copy `.env.example` to `.env.local` for RPC reads:

```bash
RH_RPC_URL=
RH_CHAIN_ID=
RH_EXPLORER_API_URL=https://robinhoodchain.blockscout.com/api/v2
RHCHECK_DB_PATH=
```

`RH_EXPLORER_API_URL` is optional and defaults to the public Robinhood Chain Blockscout API v2. It is used to discover the contract creator and verification metadata. `RHCHECK_DB_PATH` is optional; by default snapshots are stored in `data/rhcheck.sqlite`.

## Run Locally

Install dependencies:

```bash
corepack enable
pnpm install
```

Start the development server:

```bash
pnpm dev
```

Open `http://localhost:3000`, paste an address, and submit. The app will route to `/t/[address]`, call `/api/check`, and display the verdict, three facts, block, snapshot time, and copy link control.

To test the Stage 1 rights debug endpoint after setting `RH_RPC_URL` and `RH_CHAIN_ID`:

```bash
curl "http://localhost:3000/api/rights?token=0x..."
```

To test the Stage 2 pool debug endpoint:

```bash
curl "http://localhost:3000/api/pool?token=0x..."
```

The pool reader checks the verified Uniswap V2 and V3 factories against WETH and USDG pairs. V3 checks the 0.01%, 0.05%, 0.3%, and 1% fee tiers.
Quote reserves are returned both as raw base units and normalized decimal amounts. Deterministic thin-liquidity thresholds are quote-specific: 1,000 USDG or 0.5 WETH.

To test the Stage 4 check endpoint:

```bash
curl "http://localhost:3000/api/check?token=0x..."
```

You may pass a deployer address when known:

```bash
curl "http://localhost:3000/api/check?token=0x...&deployer=0x..."
```

Responses are cached in memory for 45 seconds per token/deployer pair and written to SQLite snapshots.

To read previous snapshots:

```bash
curl "http://localhost:3000/api/history?token=0x..."
```

The check endpoint has a rough in-memory limit of 60 requests per minute per IP.

To preview the OG image endpoint:

```bash
curl -I "http://localhost:3000/api/og?token=0x..."
```

Run offline rule fixtures:

```bash
pnpm test
```

Run the Stage 7 live-address QA list while the dev server is running:

```powershell
.\qa\run-checks.ps1
```
