# Polymockit

Polymockit is a Bun + TypeScript monorepo for running a Polymarket fantasy league:

- Users sign in with Shoo OAuth.
- Users can create or join leagues via invite code.
- League members use fake bankroll to buy positions on any live Polymarket market.
- Standings are marked-to-market using live Polymarket prices.

## Stack

- Bun workspaces + Turborepo
- React + Vite (frontend)
- Convex (database + backend functions)
- Effect services (typed service layer for Convex, Polymarket, and session storage)

## Monorepo Layout

- `apps/web`: Vite React client
- `packages/effect-services`: shared Effect service abstractions
- `convex`: schema and backend functions

## Quick Start

1. Install dependencies:

```bash
bun install
```

2. Start Convex in one terminal:

```bash
bun run convex:dev
```

3. Configure frontend env (either location works):

```bash
# Option A: repo root (.env.local)
VITE_CONVEX_URL=<your convex deployment url>

# Option B: apps/web/.env
VITE_CONVEX_URL=<your convex deployment url>
SITE_URL=<your web app origin, e.g. http://localhost:5173>
VITE_SHOO_BASE_URL=<optional, defaults to https://shoo.dev>
```

Note: `apps/web` also accepts `CONVEX_URL` from repo-level `.env.local` (the same file `convex dev` uses).

4. Start the web app in a second terminal:

```bash
bun run dev:web
```

5. Open [http://localhost:5173](http://localhost:5173).

## Deployment (Railway)

This repo includes `railway.json` configured to:

- install/build with Bun via Nixpacks,
- compile the monorepo,
- serve `apps/web/dist` from a production static web server process.

Deploy flow:

1. Deploy Convex first (`bun run convex:deploy`) and copy the deployment URL.
2. In Railway, set env var `VITE_CONVEX_URL` to that Convex URL.
3. Deploy this repo to Railway.

## Useful Commands

```bash
bun run dev            # turbo dev tasks
bun run dev:web        # web only
bun run build          # monorepo build
bun run typecheck      # web + shared + convex typecheck
bun run convex:dev     # local Convex dev
bun run convex:deploy  # deploy Convex backend
```
