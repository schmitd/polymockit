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

3. Configure env:

```bash
# Repo root (.env.local) - used by Convex CLI and accepted by Vite
VITE_CONVEX_URL=<your convex deployment url>
SITE_URL=<your web app origin, e.g. http://localhost:5173>
VITE_SHOO_BASE_URL=<optional, defaults to https://shoo.dev>

# apps/web/.env - frontend-only values
VITE_CONVEX_URL=<your convex deployment url>
VITE_SHOO_BASE_URL=<optional, defaults to https://shoo.dev>
```

Note: `SITE_URL` is required by `convex/auth.config.ts` to set Shoo `applicationID` (`origin:<SITE_URL>`).

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
2. Set Convex production env:
   - `SITE_URL=https://polymockit.davidschmitt.com` (your Railway/custom-domain origin)
3. Set Railway env:
   - `VITE_CONVEX_URL=<your convex production url>`
   - `VITE_SHOO_BASE_URL=https://shoo.dev` (optional if default)
4. Deploy this repo to Railway.

Push-to-deploy contract:

- Convex owns backend auth audience:
  - `SITE_URL` (must equal the public web app origin)
- Railway owns frontend runtime config:
  - `VITE_CONVEX_URL` (must point to the same Convex deployment)
  - `VITE_SHOO_BASE_URL` (optional)

## Useful Commands

```bash
bun run dev            # turbo dev tasks
bun run dev:web        # web only
bun run build          # monorepo build
bun run typecheck      # web + shared + convex typecheck
bun run convex:dev     # local Convex dev
bun run convex:deploy  # deploy Convex backend
```
