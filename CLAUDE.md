# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SalesManager-SALMIX (Daxtellk Systems) — a sales-management platform for the veterinary
sector (dashboard, orders/pedidos, forecast, budget, sales-rep efficiency, inventory,
route planning). Originally scaffolded on the Mocha.AI no-code platform and exported to
this repo; it has since been migrated off Mocha's proprietary auth service onto
self-hosted Google OAuth (see "Auth" below) — do not reintroduce `@getmocha/*` packages.

## Commands

```bash
npm run dev              # Vite dev server (frontend + Worker via @cloudflare/vite-plugin), http://localhost:5173
npm run build            # tsc -b && vite build
npm run check            # tsc && vite build && wrangler deploy --dry-run  (use before deploying)
npm run deploy           # build + wrangler deploy
npm run lint             # eslint .
npm run cf-typegen       # regenerate worker-configuration.d.ts from wrangler.json bindings
```

There is no test suite in this repo.

### Git

Single branch (`main`), remote `origin` → `https://github.com/DeepShareBlueprint/Salmix.git`.
Commit and push directly to `main` (no PR workflow set up):

```bash
git add <files>
git commit -m "..."
git push origin main
```

Run `npm run cf-typegen` after any change to `wrangler.json` bindings (D1/R2/vars) —
`worker-configuration.d.ts` is generated and gitignored.

### Local D1

`npm run dev` runs against a **local** simulated D1 (separate from the deployed
database). After creating/recreating it or changing the schema, apply
`SCHEMA-COMPLETO.sql` to both:

```bash
npx wrangler d1 execute salesmanager-db --file=SCHEMA-COMPLETO.sql            # local (dev)
npx wrangler d1 execute salesmanager-db --file=SCHEMA-COMPLETO.sql --remote   # production
```

Secrets for local dev go in `.dev.vars` (gitignored); for the deployed Worker use
`wrangler secret put <NAME>`. Required: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`SESSION_SECRET`. Optional: `OPENAI_API_KEY` (AI comments/briefing), `RESEND_API_KEY` +
`EMAIL_PEDIDOS` (order-notification emails — currently unused by this client).

## Architecture

**Stack**: React 19 + React Router (`src/react-app/`) served as static assets by a
single Cloudflare Worker (`src/worker/index.ts`, Hono) with a Cloudflare D1 (SQLite)
database bound as `DB`. Built with Vite; `@cloudflare/vite-plugin` runs the Worker
locally during `npm run dev` so frontend and API are always same-origin (no CORS/cookie
cross-site concerns in dev or prod). Path alias `@` → `src/`.

**`src/worker/index.ts` is a single ~7000-line Hono app** with every API route
(`/api/...`) defined inline, grouped under comment banners
(`// ==================== X ENDPOINTS ====================`). There's no router
splitting — when adding endpoints, find the matching section rather than assuming a
per-feature file exists. A few one-off maintenance/backfill scripts live alongside it
(`fix-vendas-sem-negocio.ts`, `consulta-vendas-por-negocio.ts`, `debug-kpis.ts`) and
`generate-prd-docx.ts` builds a `.docx` handed out to `/api/prd/download`.

**Auth** (`src/worker/auth.ts` + `src/react-app/hooks/useAuth.tsx`): self-hosted Google
OAuth (Authorization Code flow), no third-party auth service.
- Flow: `GET /api/oauth/google/redirect_url` builds the Google consent URL and sets an
  `oauth_state` cookie → Google redirects to `/auth/callback` → frontend
  `exchangeCodeForSessionToken()` reads `code`/`state` from the URL and posts to
  `POST /api/sessions`, which exchanges the code with Google, verifies the `id_token`
  against Google's JWKS, and issues our own session as an HS256 JWT (`jose`) in an
  httpOnly cookie (`session_token`).
- `authMiddleware` verifies that cookie, sets `c.set('user', ...)` with shape
  `{ id, email, google_user_data: { name, picture } }`, and renews the cookie
  (sliding 60-minute expiration) on every authenticated request.
- Frontend: `AuthProvider`/`useAuth()` in `src/react-app/hooks/useAuth.tsx` expose
  `{ user, isPending, redirectToLogin, exchangeCodeForSessionToken, fetchUser, logout }`
  — the same shape the old Mocha SDK exposed, so page components consume it unchanged.
- `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`'s registered redirect URIs (Google Cloud
  Console) must include every origin this app is ever served from (currently
  `localhost:5173`, `salesmanager.daxtellk.workers.dev`, `salesmanager.salmix.sa`) — a
  mismatch fails silently from the user's perspective (bounces back to `/login`); check
  the `npm run dev` terminal output for the actual Worker-side error.

**Users & access control**: the `usuarios` D1 table is keyed by `email`; the
`mocha_user_id` column (kept as-is, not renamed) now stores the Google `sub`. The very
first row ever inserted is auto-provisioned as `Administrador` on first login
(bootstrap check in `GET /api/users/me`); everyone else must go through
`/access-request` and be approved by an admin. `nivel_acesso` values
(`Administrador`, `Gerente`, `Operador`, `Representante`, ...) drive both post-login
redirect target (`AuthCallback.tsx`) and route gating
(`components/RoleProtectedRoute.tsx`, wrapping routes in `App.tsx`).

**Static branding assets** (logo, Daxtellk mark) live in `public/` and are referenced by
root-relative paths (`/logo-sales-manager.png`, `/daxtellk-logomarca.png`) — these were
re-hosted from Mocha's CDN, so don't reintroduce `mocha-cdn.com`/`static.getmocha.com`
URLs. `worker/index.ts`'s PDF/email-generation code receives the logo URL as a
parameter (`generateOrderPDF`/`sendOrderEmail`) built from `c.req.url`'s origin, since
the Worker has no implicit page origin to resolve a relative path against.

**Shared code** (`src/shared/`): `types.ts` (API/domain types shared by
frontend+worker) and `negocio-mapping.ts` (maps raw sales-negócio codes to display
groupings, used by both the dashboard hook and the worker's KPI queries — keep both
sides in sync if it changes).
