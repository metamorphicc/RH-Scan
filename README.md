# rhcheck

rhcheck is a TypeScript Next.js App Router project for a read-only Robinhood Chain token check page.

This repository currently includes Stages 0-6. It provides the app skeleton, an address input on the home page, a token result page at `/t/[address]`, environment variable examples, temporary debug APIs for rights and pool reads, deterministic offline verdict rules, an end-to-end check API, OG images, and a rough in-memory rate limit.

## What It Is

- A read-only token check interface for Robinhood Chain.
- A result page that routes an entered address to `/t/[address]` and displays the latest check result.
- A temporary `GET /api/rights?token=0x...` endpoint that reads known view methods with `eth_call`.
- A temporary `GET /api/pool?token=0x...` endpoint that can read V2 pools once verified Robinhood Chain venues are added.
- A `GET /api/check?token=0x...` endpoint that combines rights, pool facts, deployer stats, rules, caching, and snapshot storage.
- A `GET /api/og?token=0x...` image endpoint for link previews.
- A rough per-IP in-memory rate limit on `/api/check`.
- Offline deterministic rules that can produce `don't`, `thin`, or `ok to size small`.

## What It Is Not

- No wallet connection.
- No signer.
- No swap flow.
- No buy button.
- No LLM scoring.
- No explorer-backed deployer discovery, OG cards, alerts, or payments.
- No invented DEX/factory addresses; `lib/venues.ts` must be filled only with verified Robinhood Chain venues.
- No history UI, alerts, or payments.
- No guarantee language about token outcomes.

## Environment

Copy `.env.example` to `.env.local` for RPC reads:

```bash
RH_RPC_URL=
RH_CHAIN_ID=
RH_EXPLORER_API_URL=
RHCHECK_DB_PATH=
```

`RH_EXPLORER_API_URL` is reserved for later stages. `RHCHECK_DB_PATH` is optional; by default snapshots are stored in `data/rhcheck.sqlite`.

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

Until verified venues are added to `lib/venues.ts`, pool status is expected to be `unknown`.

To test the Stage 4 check endpoint:

```bash
curl "http://localhost:3000/api/check?token=0x..."
```

You may pass a deployer address when known:

```bash
curl "http://localhost:3000/api/check?token=0x...&deployer=0x..."
```

Responses are cached in memory for 45 seconds per token/deployer pair and written to SQLite snapshots.

The check endpoint has a rough in-memory limit of 60 requests per minute per IP.

To preview the OG image endpoint:

```bash
curl -I "http://localhost:3000/api/og?token=0x..."
```

Run offline rule fixtures:

```bash
pnpm test
```
