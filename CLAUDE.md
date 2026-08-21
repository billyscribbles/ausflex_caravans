# CLAUDE.md — Foundation Starter Repo

This repo is **Billy's agency foundation template**. It is NOT a client site. It is the clean, opinionated scaffold that every new client site starts from.

When Billy opens this repo and tells you to start a new business site, your job is to perform **"The Big Switch"** — reskin this foundation into a new site end-to-end — without touching component internals unless strictly necessary.

---

## What this repo is

A marketing/landing-site starter distilled from `my_studio` (Onrai Studio). It covers the ~80% case: homepage, services, about, contact, legal, 404. **Scope is landing pages only** — this template is not for commerce or app/SaaS builds.

**Sibling reference repo on this machine** (read-only, for patterns):

- `/Users/billyhuynh/Github/my_studio` — the source marketing site this foundation was distilled from. When in doubt about a pattern, look here.

## Tech stack (do not change without asking)

- React 18 + Vite 5
- React Router v7 (SPA, BrowserRouter, lazy-loaded pages)
- Plain CSS with CSS variables — **no Tailwind**
- Framer Motion 11 (scroll-in `whileInView` pattern)
- Lucide React icons
- Yarn 4.12 with `.pnp` caching
- `react-helmet-async` for per-page SEO
- Formspree for the contact form (env-driven)
- Railway deployment (`railway.json`) — driven by the `railway-deploy` skill
- ESLint (flat config) + Prettier for code quality; Vitest for the contract suite
- GitHub Actions CI (`.github/workflows/ci.yml`) — lint (incl. jsx-a11y) + format check + test (incl. axe) + build + Lighthouse gate
- Opt-in analytics (`src/lib/analytics.js`) and error reporting (`src/lib/errorReporter.js`) — both no-op until env keys are set
- JSX, **no TypeScript**

## The Three-File Swap Model

Every client-specific value lives in one of three layers. Components are "dumb" — they read from config/content and contain zero client strings, colors, or links.

1. **`src/config/theme.config.js`** — design tokens (colors, fonts, radii, shadows, transitions, breakpoints). A boot helper (`src/lib/applyTheme.js`) flattens this to CSS custom properties on `:root` at app start, so all CSS keeps using `var(--color-accent)` etc.

2. **`src/config/site.config.js`** — brand identity and integrations:

   ```
   brand:        { name, logoSrc, logoText, tagline }
   nav:          [{ label, href }]
   footer:       { columns, legal, copyright }
   social:       { instagram, linkedin, ... }
   seo:          { defaultTitle, titleTemplate, description, ogImage, siteUrl }
   integrations: { formspreeId, gaId }
   contact:      { email, phone, address }
   ```

3. **`src/content/*.js`** — per-section copy, one file per section: `hero.js`, `stats.js`, `services.js`, `howItWorks.js`, `testimonials.js`, `faq.js`, `legal.js`. Section components import directly from their content file. No prop drilling, no context.

Plus: **`public/brand/`** for `logo.svg`, `logo-mark.svg`, `favicon.svg`, and an `og-image` (the template ships an SVG placeholder — replace with a 1200×630 PNG before launch, since social platforms ignore SVG previews). **`public/fonts/`** holds self-hosted woff2 display + body fonts: the template ships none, so drop them in per client and uncomment the preload block in `index.html`.

## Directory structure

```
foundation/
├── public/
│   ├── brand/          logo.svg, logo-mark.svg, favicon.svg, og-image.png
│   ├── fonts/          default display + body (woff2, preloaded)
│   └── images/         placeholder hero/section imagery
├── src/
│   ├── config/
│   │   ├── theme.config.js
│   │   └── site.config.js
│   ├── content/
│   │   ├── hero.js
│   │   ├── stats.js
│   │   ├── services.js
│   │   ├── howItWorks.js
│   │   ├── testimonials.js
│   │   ├── faq.js
│   │   └── legal.js
│   ├── lib/
│   │   ├── applyTheme.js     writes theme.config -> CSS vars on :root
│   │   ├── seo.jsx           Helmet wrapper + JSON-LD using site.config.seo
│   │   ├── motion.js         reduced-motion-aware scroll-in variants
│   │   ├── analytics.js      opt-in GA4 wiring (no-op without VITE_GA_ID)
│   │   └── errorReporter.js  opt-in error reporting (no-op without Sentry)
│   ├── components/
│   │   ├── ErrorBoundary.jsx / .css   route-level render-error fallback
│   │   ├── RouteFallback.jsx / .css   Suspense loading state
│   │   ├── Navbar.jsx / .css
│   │   ├── Footer.jsx / .css
│   │   ├── Hero.jsx / .css
│   │   ├── Stats.jsx / .css
│   │   ├── Services.jsx / .css
│   │   ├── HowItWorks.jsx / .css
│   │   ├── Testimonials.jsx / .css
│   │   ├── FAQ.jsx / .css
│   │   └── Contact.jsx / .css
│   ├── pages/
│   │   ├── Home.jsx            composes all sections
│   │   ├── ServicesPage.jsx
│   │   ├── AboutPage.jsx
│   │   ├── ContactPage.jsx
│   │   ├── LegalPage.jsx       renders privacy or terms from legal.js
│   │   └── NotFoundPage.jsx
│   ├── App.jsx
│   ├── main.jsx                calls applyTheme() then mounts
│   └── index.css               base resets + utility classes
├── .env.example                VITE_FORMSPREE_ID, VITE_SITE_URL, VITE_GA_ID, VITE_SENTRY_DSN, VITE_NOINDEX
├── .nvmrc                      Node 20 — single source of truth (CI + Nixpacks read it)
├── .editorconfig / .gitattributes / .vscode/   editor + line-ending hygiene
├── index.html
├── package.json
├── vite.config.js              manual vendor chunks (react, motion) + security headers on preview
├── lighthouserc.json           Lighthouse CI thresholds
├── scripts/
│   └── gen-seo-files.mjs       post-build: templates sitemap/robots domain; VITE_NOINDEX=true → Disallow-all robots.txt
├── docs/
│   └── ENVIRONMENTS.md         main=staging / production branch + Railway envs
├── .github/                    ci.yml, dependabot.yml (monthly, grouped), PR template
├── railway.json
└── README.md                   "How to fork" checklist
```

### Components included

Lifted from `my_studio`: `Navbar`, `Footer`, `Hero`, `Stats`, `Services`, `HowItWorks`, `Testimonials`, `FAQ`, `Contact`.

Explicitly **excluded** as too site-specific (add back per-project only if asked): `Industries`, `AIFeatures`, `Shop` pricing cards, `Portfolio`, `TechStack`, `BacklinkSourcesDiagram`, `ContentClusterDiagram`, `CaseStudyElusiveRacing`, `TheClimbPage`, `AIPage`.

### CSS utility classes kept

`.container`, `.section`, `.section--dark`, `.section-label`, `.section-sub`, `.glow-card` — all copied from `my_studio/src/index.css`. These are the shared styling primitives; keep using them rather than inventing new ones.

### Routes

```
/            Home
/services    ServicesPage
/about       AboutPage
/contact     ContactPage
/privacy     LegalPage (section="privacy")
/terms       LegalPage (section="terms")
*            NotFoundPage
```

---

## The Big Switch — kicking off a new business site

When Billy says something like _"start a new site for [Client]"_, _"let's build [Client]'s site"_, or _"kick off a new business"_, run this workflow. The **`big-switch` skill** orchestrates these steps end to end and tells you which other skills to invoke at each beat — start there; the steps below remain the source of truth for what each step does.

### Step 0 — Confirm the client brief first

Before editing anything, ask Billy for the basics if they aren't already in the conversation:

1. **Business name** and one-line tagline
2. **Industry / what they do**
3. **Brand colors** (or a vibe — "dark luxury", "minimal pastel", "bold tech") so you can propose `theme.config.js` values
4. **Logo asset** (file path, or "generate a text logo for now")
5. **Nav pages they want** (default: Home, Services, About, Contact)
6. **Domain** (for SEO) and Formspree ID (or leave the env placeholder)
7. **Any sections they DON'T want** from the default set

Don't guess brand identity. Ask.

### Step 1 — Decide: in-place edit or new repo?

Default: **clone this foundation into a sibling directory** (e.g., `/Users/billyhuynh/Github/<client-name>`) and work there. Never commit client-specific changes back into `foundation/` itself. If Billy explicitly says "just edit in place for a test", you can — but warn him first.

Once the clone exists, set up the branch model from **`docs/ENVIRONMENTS.md`**: `main` is **staging**, a `production` branch is what goes live. Create both branches at init time so the release path exists before the first deploy.

### Step 2 — Execute the swap (in order)

1. **`src/config/site.config.js`** — brand, nav, footer, social, SEO, contact, integration IDs.
2. **`src/config/theme.config.js`** — colors, fonts, radii. Match the brand. If using custom fonts, also drop the woff2 files into `public/fonts/` and uncomment the preload block in `index.html`.
3. **`public/brand/`** — drop in `logo.svg`, `favicon.svg`, and an `og-image` (ship a 1200×630 PNG/JPG — social platforms don't render SVG). If assets aren't provided, generate clean SVG placeholders that match the brand name + colors.
4. **`src/content/*.js`** — rewrite each section's copy. Write real marketing copy for the client's industry, not lorem ipsum. Match the tone Billy specified (or ask).
5. **`.env`** — copy from `.env.example` and fill `VITE_FORMSPREE_ID`, `VITE_SITE_URL`. Optionally set `VITE_GA_ID` (analytics) and `VITE_SENTRY_DSN` (error monitoring) — both stay dormant when blank. `VITE_NOINDEX=true` goes on the **staging** Railway environment only (never production, never local `.env`) — see `docs/ENVIRONMENTS.md`.
6. **`index.html`** — update the fallback `<title>`, `<meta description>`, og/twitter tags, and favicon link. (Helmet will override at runtime, but this is the pre-hydration fallback.)
7. **`public/sitemap.xml`** and **`public/robots.txt`** — leave the placeholder domain in place; `yarn build` rewrites it from `VITE_SITE_URL` via `scripts/gen-seo-files.mjs`. Just add/remove `<url>` entries to match the client's routes.

### Step 3 — Add/remove pages if needed

If Billy asks for extra sections or pages not in the default set:

- **Extra section:** create a new `src/content/<name>.js`, copy the closest existing component as a starting point, and compose it into the relevant page. Prefer composition over editing existing components.
- **Extra page:** add a lazy route in `src/App.jsx` following the existing pattern (lazy + Suspense + chunk retry).
- **Remove a section:** delete it from the page composition in `src/pages/Home.jsx`. Leave the component file in place unless Billy asks to delete it — easier to put back.

### Step 4 — Verify end-to-end before declaring done

Run through this list. Do not claim the site is done until every step passes.

1. `yarn install && yarn dev` — starts with zero warnings.
2. Home page renders every section with real client copy and no layout breakage.
3. Change `site.config.js` → brand name → verify Navbar, Footer, `<title>`, og meta all update without touching components.
4. Change `theme.config.js` → `colors.accent` → verify every accent surface (buttons, hover states, glow cards) updates site-wide.
5. Navigate every route including `/does-not-exist` (404).
6. Submit the contact form against the real Formspree endpoint — verify success state.
7. `yarn lint && yarn format:check` — ESLint and Prettier pass clean.
8. `yarn build && yarn preview` — production build succeeds, vendor chunks split as expected.
9. Lighthouse on `yarn preview`: performance ≥ 90, SEO ≥ 95, a11y ≥ 90 on the home page.
10. Resize at 375px / 768px / 1280px — hamburger, grids, and footer all respond cleanly.
11. `yarn test` — the `src/test/` contract suite passes, confirming the config/content swap is wired end-to-end.
12. Deploy with the `railway-deploy` skill — **staging first** (`main`), then promote to production per `docs/ENVIRONMENTS.md`. Re-verify routes and the contact form on each live domain.

Report verification results with evidence (command output, observed behavior), not vibes.

---

## Environments & releases

Full contract: **`docs/ENVIRONMENTS.md`**. The short version, which applies to every site built from this template:

- **`main` is staging**, not production. It auto-deploys to the Railway `staging` environment on every green push.
- **`production` is a separate branch** that only ever fast-forwards from `main` (`git merge --ff-only main`), and auto-deploys to the Railway `production` environment on the client's real domain.
- One Railway project per client, two environments, **separate env vars per environment** — staging gets its own `VITE_SITE_URL`, its own (or no) Formspree form, and a blank `VITE_GA_ID`.
- Never point staging at the production domain, and never hand out a staging URL without reading the "Keeping staging out of Google" section first.

---

## Rules for working in this repo

- **Never hardcode client strings, colors, or links in components.** If you're tempted to, the correct answer is to add a field to `site.config.js` or a content file and read it from there.
- **Never introduce Tailwind, styled-components, or any other CSS system.** Plain CSS + CSS variables is the house style.
- **Never add TypeScript.** JSX only, matching the existing sibling repos.
- **Never invent new design tokens.** Add them to `theme.config.js` and expose via `applyTheme.js`. Never write raw hex/rem in component CSS.
- **Never delete the placeholder content files** when reskinning — rewrite them in place. The shape is part of the contract.
- **Prefer lifting a pattern from `my_studio`** over inventing a new one. If `my_studio` does it a certain way and it's reasonable, match it.
- **Keep commits atomic** when editing — one commit per swap step (site config, theme, content, etc.) makes rollback trivial.
- **Don't over-engineer.** This is a template. Small, focused, easy to scan > clever abstractions.
- **Code must pass CI and Lighthouse before declaring done.** GitHub Actions (`.github/workflows/ci.yml`) must be green — lint (incl. jsx-a11y), format check, tests (incl. axe), and build all pass. Lighthouse thresholds in `lighthouserc.json` must be met: performance ≥ 90, SEO ≥ 95, a11y ≥ 90. No "I'll fix it later" — failing CI or Lighthouse means the work is not done.

## Known non-blocking considerations

- **Repo hosting:** this should be a GitHub Template repo so "Use this template" gives clean clones.
- **Default typography:** Inter + a display serif as safe defaults; override per client.
- **Scope:** landing pages only. Commerce and app/SaaS builds are out of scope for this template.
