# rhcheck

rhcheck is a TypeScript Next.js App Router project for a read-only Robinhood Chain token check page.

This repository is currently Stage 0 only. It provides the app skeleton, an address input on the home page, a placeholder token page at `/t/[address]`, environment variable examples, and typed stubs for the later check pipeline.

## What It Is

- A read-only token check interface for Robinhood Chain.
- A placeholder that routes an entered address to `/t/[address]`.
- A foundation for later deterministic checks that may eventually produce `don't`, `thin`, or `ok to size small`.

## What It Is Not

- No wallet connection.
- No signer.
- No swap flow.
- No buy button.
- No LLM scoring.
- No real RPC calls in this step.
- No guarantee language about token outcomes.

## Environment

Copy `.env.example` to `.env.local` when later stages need configuration:

```bash
RH_RPC_URL=
RH_CHAIN_ID=
RH_EXPLORER_API_URL=
```

These variables are not used in Stage 0.

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
