# Polymockit

Polymockit is a Bun + TypeScript monorepo for running a Polymarket fantasy league:

- Users sign in with Auth0.
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
VITE_AUTH0_DOMAIN=<your Auth0 tenant domain>
VITE_AUTH0_CLIENT_ID=<your Auth0 SPA client id>

# apps/web/.env - frontend-only values
VITE_CONVEX_URL=<your convex deployment url>
VITE_AUTH0_DOMAIN=<your Auth0 tenant domain>
VITE_AUTH0_CLIENT_ID=<your Auth0 SPA client id>
```

Create an Auth0 Single Page Application. Allow the local and production origins in its callback URLs and web origins. Allow `/auth/logout-complete.html` on each origin as a logout URL. Enable rotating refresh tokens. Then configure each Convex deployment:

```bash
bunx convex env set AUTH0_DOMAIN <your Auth0 tenant domain>
bunx convex env set AUTH0_CLIENT_ID <your Auth0 SPA client id>
```

The browser SDK persists its rotating refresh token so a full page reload can restore the session even when third-party cookies are blocked. Auth0 owns PKCE, rotation, reuse detection, validation, and renewal; the restrictive CSP limits the script surface that could access browser storage. Convex's Auth0 adapter renews backend credentials without replacing the app shell.

See [docs/auth0-migration.md](docs/auth0-migration.md) for the security decisions, rollout sequence, and rollback plan.

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
   - `AUTH0_DOMAIN=<your Auth0 tenant domain>`
   - `AUTH0_CLIENT_ID=<your Auth0 SPA client id>`
3. Set Railway env:
   - `VITE_CONVEX_URL=<your convex production url>`
   - `VITE_AUTH0_DOMAIN=<your Auth0 tenant domain>`
   - `VITE_AUTH0_CLIENT_ID=<your Auth0 SPA client id>`
4. Deploy this repo to Railway.

Push-to-deploy contract:

- Convex owns backend token verification:
  - `AUTH0_DOMAIN`
  - `AUTH0_CLIENT_ID`
- Railway owns frontend runtime config:
  - `VITE_CONVEX_URL` (must point to the same Convex deployment)
  - `VITE_AUTH0_DOMAIN`
  - `VITE_AUTH0_CLIENT_ID`

## Useful Commands

```bash
bun run dev            # turbo dev tasks
bun run dev:web        # web only
bun run build          # monorepo build
bun run typecheck      # web + shared + convex typecheck
bun run test           # backend unit tests
bun run test:e2e       # authentication shell browser tests
bun run convex:dev     # local Convex dev
bun run convex:deploy  # deploy Convex backend
```
