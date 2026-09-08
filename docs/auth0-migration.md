# Auth0 migration plan

## Outcome

Replace Shoo with Auth0 and Convex's supported Auth0 adapter. Keep the Polymockit shell mounted during authentication changes, renew backend credentials without an interactive redirect, and keep token lifecycle code out of the application.

## Security decisions

- Google-only sign-in for launch. Disable the database/password connection on the production Auth0 application, not merely its signup link. The frontend requests `google-oauth2` explicitly. Password signup and password recovery are intentionally out of scope.
- Use an Auth0 Single Page Application with Authorization Code Flow and PKCE through `@auth0/auth0-react`.
- Use `ConvexProviderWithAuth0` for ID token acquisition, renewal, and Convex authentication.
- Persist the SDK cache in local storage so a full reload restores the session when third-party cookies are blocked. Do not read, copy, log, or otherwise handle those tokens in application code.
- Offset local-storage exposure with refresh-token rotation and reuse detection, short token lifetimes, an exact origin allowlist, dependency review, and a restrictive CSP. A same-site Auth0 custom domain would allow reevaluating the SDK's in-memory worker cache later.
- Keep the SDK's silent authorization fallback for browsers where the Auth0 session cookie is available.
- Use exact callback, logout, and web-origin allowlists. Do not use wildcard production origins.
- Request only `openid profile email`. Treat email as an account-linking signal only when Auth0 reports it as verified.
- Never log tokens, authorization codes, callback query strings, or raw identity payloads.
- Serve a restrictive CSP and browser security headers from `apps/web/public/serve.json`. Add the exact custom Auth0 domain to `connect-src`, `frame-src`, and `form-action` before enabling that domain.

## UX decisions

- Sign in with a user-initiated popup, leaving the desk shell in place.
- Sign out through an Auth0 logout popup that returns to `/auth/logout-complete.html` and closes itself. The main desk does not navigate.
- Render one stable session overlay while the initial identity and user record resolve.
- Keep the authenticated desk visible during routine background renewal.
- Clear private league state immediately after logout and confirm the result inline.

## First Auth0 setup

1. Create an Auth0 account and a development tenant.
2. Create an application with type **Single Page Application**. Do not place its client secret in this repository or the browser environment.
3. Configure exact application URLs:
   - Allowed Callback URLs: `http://localhost:5173`, plus the production origin.
   - Allowed Logout URLs: `http://localhost:5173/auth/logout-complete.html`, plus the production equivalent.
   - Allowed Web Origins: `http://localhost:5173`, plus the production origin.
4. Under Authentication > Social, create a Google connection and enable it only for the Polymockit application.
5. In a dedicated Polymockit GCP project, create a new OAuth 2.0 Web Application client for Auth0. Keeping it separate from other applications makes rollback and credential rotation safer.
6. Set the Google client authorized origin to the Auth0 tenant origin and its redirect URI to `https://YOUR_AUTH0_DOMAIN/login/callback`.
7. Put the Google client ID and secret in the Auth0 Google connection. The Google secret belongs only in Auth0, never in Vite, Convex, Railway, or this repository.
8. Request only `openid profile email`. Polymockit uses the verified email, name, and picture claims.
9. Use separate Auth0 applications for development and production, with no localhost callbacks on the production application. The initial rollout shares the existing dedicated Polymockit tenant and Google connection; full tenant separation is a follow-up before adding tenant-wide experiments or additional identity providers.

Auth0 development keys are acceptable only for the first local smoke test. They do not provide the session behavior required for production refresh and logout testing.

## Existing-user linking policy

- Automatically link only when Auth0 asserts `email_verified: true` and exactly one existing user has the normalized email.
- Preserve that existing Convex user document ID.
- Never auto-link missing or unverified email claims.
- Send duplicate-email, same-issuer, and missing-account conflicts to manual review.
- Record every created or verified-email link in `authLinkAudits`.

## Rollout

1. Provision separate Auth0 development and production applications as tracked in [issue 1](https://github.com/schmitd/polymockit/issues/1).
2. Enable refresh token rotation, reuse detection, and the Google identity connection.
3. Set the frontend `VITE_AUTH0_DOMAIN` and `VITE_AUTH0_CLIENT_ID` values.
4. Set `AUTH0_DOMAIN` and `AUTH0_CLIENT_ID` on each Convex deployment, then deploy `convex/auth.config.ts`.
5. Complete the existing-user mapping in [issue 2](https://github.com/schmitd/polymockit/issues/2) before production cutover. Preserve Convex user document IDs.
   - Run the internal `authMigration:inventory` query and resolve every duplicate-email candidate.
   - Run `authMigration:backfillNormalizedEmails` with `{}` first, then pass each returned `cursor` as `{ "cursor": "..." }` until `hasMore` is false. Pagination advances past users without email instead of repeatedly processing the same batch.
6. Run cold-start, popup, refresh, revocation, offline, multi-tab, and logout checks from [issue 4](https://github.com/schmitd/polymockit/issues/4).
7. Release to development, then a production canary. Monitor authentication errors without capturing secrets or PII.
8. Remove Shoo deployment configuration only after the Auth0 rollback window closes.

## Rollback

- Export the subject mapping and affected user IDs before cutover.
- Keep the last Shoo-compatible release deployable during the canary window.
- Roll back frontend and Convex auth configuration together. A mixed provider state will fail authentication.
- Do not delete or rewrite user records during rollback. Restore provider configuration, then investigate mappings offline.
