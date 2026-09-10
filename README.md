# rhcheck

rhcheck is a TypeScript Next.js App Router project for a read-only Robinhood Chain token check page.

This repository currently includes Stages 0-3. It provides the app skeleton, an address input on the home page, a placeholder token page at `/t/[address]`, environment variable examples, temporary debug APIs for rights and pool reads, and deterministic offline verdict rules.

## What It Is

- A read-only token check interface for Robinhood Chain.
- A placeholder that routes an entered address to `/t/[address]`.
- A temporary `GET /api/rights?token=0x...` endpoint that reads known view methods with `eth_call`.
- A temporary `GET /api/pool?token=0x...` endpoint that can read V2 pools once verified Robinhood Chain venues are added.
- Offline deterministic rules that can produce `don't`, `thin`, or `ok to size small`.

## What It Is Not

- No wallet connection.
- No signer.
- No swap flow.
- No buy button.
- No LLM scoring.
- No deployer history, persistence, verdict evaluation, OG cards, alerts, or payments.
- No invented DEX/factory addresses; `lib/venues.ts` must be filled only with verified Robinhood Chain venues.
- No wired end-to-end `/api/check` pipeline yet.
- No guarantee language about token outcomes.

## Environment

Copy `.env.example` to `.env.local` for Stage 1 RPC reads:

```bash
RH_RPC_URL=
RH_CHAIN_ID=
RH_EXPLORER_API_URL=
```

`RH_EXPLORER_API_URL` is reserved for later stages.

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

Open `http://localhost:3000`, paste an address, and submit. The app will route to `/t/[address]` and show a `not wired` placeholder with the raw address.

To test the Stage 1 rights debug endpoint after setting `RH_RPC_URL` and `RH_CHAIN_ID`:

```bash
curl "http://localhost:3000/api/rights?token=0x..."
```

To test the Stage 2 pool debug endpoint:

```bash
curl "http://localhost:3000/api/pool?token=0x..."
```

Until verified venues are added to `lib/venues.ts`, pool status is expected to be `unknown`.

Run offline rule fixtures:

```bash
pnpm test
```
