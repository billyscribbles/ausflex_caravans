# Foundation — Agency Starter Template

Opinionated React + Vite starter for spinning up marketing/landing sites in minutes.
Distilled from `onrai_studio`. Not a client site — a scaffold every client site forks from.

Read `CLAUDE.md` for the full contract (design system, routes, component rules, "Big Switch" workflow).

## Quick start

Requires Node 20+ (pinned in `.nvmrc`).

```bash
yarn install
cp .env.example .env      # fill VITE_FORMSPREE_ID + VITE_SITE_URL
yarn dev
```

Open http://localhost:5173. You should see a fully-rendered site with placeholder content.

## The three-file swap

Every new client site is built by editing these — **not** components:

1. **`src/config/site.config.js`** — brand name, logo, nav, footer, SEO, social, contact, integration IDs.
2. **`src/config/theme.config.js`** — colors, fonts, radii, shadows, transitions. Flows into CSS variables automatically.
3. **`src/content/*.js`** — one file per section (`hero.js`, `services.js`, `testimonials.js`, …). Rewrite copy in place.

Plus **`public/brand/`** — drop in `logo.svg`, `favicon.svg`, `og-image.svg`.

## How to fork for a new client

The `big-switch` skill orchestrates all of this — ask Claude to "start a new
site for [Client]". Manual checklist:

1. Copy this repo: `cp -R foundation /path/to/client-name` (or use GitHub "Use this template").
2. Edit `src/config/site.config.js` — brand name, nav, footer, SEO, contact, social.
3. Edit `src/config/theme.config.js` — colors and fonts. Using custom fonts? Drop the woff2 files into `public/fonts/` and uncomment the preload block in `index.html`.
4. Drop assets into `public/brand/` (`logo.svg`, `favicon.svg`, `og-image`). Replace the SVG og-image placeholder with a **1200×630 PNG/JPG** — social platforms don't render SVG previews.
5. Rewrite each file in `src/content/` with real copy.
6. Copy `.env.example` → `.env`, set `VITE_FORMSPREE_ID` and `VITE_SITE_URL`. Optionally set `VITE_GA_ID` / `VITE_SENTRY_DSN` (see "Analytics & error monitoring").
7. Adjust the `<url>` entries in `public/sitemap.xml` to match the client's routes — the domain is templated from `VITE_SITE_URL` at build time, so leave `https://example.com` in place.
8. `yarn lint && yarn format:check && yarn test` — confirm the swap is wired and clean.
9. `yarn dev` — verify, then `yarn build && yarn preview` for the production check.

## What's included

**Routes:** `/`, `/services`, `/about`, `/contact`, `/privacy`, `/terms`, `*` (404).

**Components:** `Navbar`, `Footer`, `Hero`, `Stats`, `Services`, `HowItWorks`, `Testimonials`, `FAQ`, `Contact`.

**Utilities:** `SEO` wrapper + JSON-LD (`src/lib/seo.jsx`), `applyTheme()` bootstrap (`src/lib/applyTheme.js`), reduced-motion scroll-in helper (`src/lib/motion.js`), opt-in analytics/error reporting (`src/lib/analytics.js`, `src/lib/errorReporter.js`).

**Resilience:** route-level `ErrorBoundary`, `Suspense` loading state (`RouteFallback`), skip-to-content link, and a chunk-retry guard for stale tabs after redeploys.

## Code quality

- `yarn lint` — ESLint (flat config, `eslint.config.js`), including `jsx-a11y` accessibility rules.
- `yarn format` / `yarn format:check` — Prettier (`.prettierrc`).
- `yarn test` — Vitest contract suite (`src/test/`), including an axe accessibility check.
- `yarn build:analyze` — build with a `dist/bundle-stats.html` size report.
- CI (`.github/workflows/ci.yml`) runs lint + format check + test + build + a Lighthouse gate (performance ≥ 90, a11y ≥ 90, SEO ≥ 95) on every push and PR.

## House rules

- No Tailwind. Plain CSS + CSS variables only.
- No TypeScript. JSX only.
- No hardcoded client strings, colors, or links in components — read from `site.config`/`content` files.
- New design tokens go in `theme.config.js`, not as raw hex/rem in CSS.
- Section components keep the Framer Motion `whileInView` pattern for scroll-in animations.

## Adding a new section

1. Create `src/content/mySection.js` exporting the data.
2. Create `src/components/MySection.jsx` (+`.css`) that imports it.
3. Compose it into the relevant page in `src/pages/`.

## Adding a new page

1. Create `src/pages/MyPage.jsx`.
2. Add a lazy route in `src/App.jsx` following the `lazyWithRetry` pattern.
3. Add the nav link in `site.config.js` under `nav`.

## Analytics & error monitoring

Both are opt-in and cost nothing when unused — leave the env vars blank to ship neither.

**Analytics (GA4).** Set `VITE_GA_ID` (e.g. `G-XXXXXXXXXX`) in `.env`. `src/lib/analytics.js`
then injects the gtag script at boot and sends a `page_view` on every route change.
Blank `VITE_GA_ID` → no script, no calls.

**Error monitoring (Sentry).** `ErrorBoundary` forwards caught render errors to
`src/lib/errorReporter.js`, which calls `window.Sentry.captureException` **if** a Sentry
SDK is present. The template bundles no SDK. To enable it, either:

- add the [Sentry Loader Script](https://docs.sentry.io/platforms/javascript/install/loader/)
  to `index.html` with the client's DSN, or
- `yarn add @sentry/react` and initialise it in `src/main.jsx` using `VITE_SENTRY_DSN`.

Until then `reportError` is silent in production and logs to the console in development.

## Admin dashboard

Ausflex staff manage gallery photos and 360° tours at **`/admin`**, publishing to the live
site with no redeploy. It is `noindex`, disallowed in `robots.txt`, and lazy-loaded as its
own chunk, so none of it reaches public visitors.

Photos and tour metadata live in `content.json` on a Railway volume, alongside the uploaded
images. On first boot the server seeds that file from `src/content/gallery.js` and
`tour.js`, so a fresh environment opens with the photo set that ships in the repo. Those
static files stay in place as the runtime fallback: if the API is unreachable the site
renders them rather than an empty gallery.

**Setup.** Generate a password hash and a session secret, then set them in Railway:

```bash
yarn node scripts/hash-password.mjs 'the-password'   # -> ADMIN_PASSWORD_HASH
openssl rand -hex 32                                 # -> SESSION_SECRET
```

Login is a single shared password, rate-limited to 10 attempts per IP per 15 minutes. The
server boots fine without a hash configured — logins simply always fail — so CI needs no
secrets.

**Local development** needs two terminals: `yarn dev` for the SPA and `yarn dev:api` for the
server. Vite proxies `/api` and `/uploads` to port 3001, and the store defaults to a
gitignored `./.data`.

Uploads are resized and re-encoded to WebP in the browser before they are sent, so a 9MB
phone photo arrives as roughly 300KB. Alt text is optional; a photo without it renders
`alt=""`, which is correct markup for a decorative image and keeps the accessibility score
intact.

## Deployment

Ready for Railway out of the box (`railway.json` included). `yarn start` boots the Express
server (`server/index.js`), which serves the production build on port 4173 with baseline
security headers and the admin API.

**This site needs a Railway volume mounted at `/data`** — without it the client's uploaded
photos are silently discarded on every deploy. See [`docs/ENVIRONMENTS.md`](docs/ENVIRONMENTS.md).

Ask Claude to "deploy to Railway" — the `railway-deploy` skill drives project creation, env
vars, deploy, and domain generation via the Railway MCP.

**Two environments, always.** `main` is **staging** (auto-deploys to the Railway `staging`
environment); a `production` branch, fast-forwarded from `main`, is what goes live on the
client's domain. Set both up when you create the clone —
see [`docs/ENVIRONMENTS.md`](docs/ENVIRONMENTS.md) for the branch model, Railway setup,
per-environment env vars, rollback, and hotfix flow. Set `VITE_NOINDEX=true` on the staging
environment so it never gets indexed; never set it on production.
