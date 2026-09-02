# Environments & Release Flow

Every site built from this Foundation runs **two environments on one Railway
project**. This file is the contract — set it up this way on every new clone,
before the first deploy.

|                           | Staging                                                                      | Production                           |
| ------------------------- | ---------------------------------------------------------------------------- | ------------------------------------ |
| Git branch                | `main`                                                                       | `production`                         |
| Railway environment       | `staging`                                                                    | `production` (Railway's default env) |
| Deploys when              | every push to `main`, CI green                                               | every push to `production`, CI green |
| Domain                    | `<service>.up.railway.app`                                                   | the client's real domain             |
| Indexed by search engines | **no** (see [Keeping staging out of Google](#keeping-staging-out-of-google)) | yes                                  |
| Analytics (`VITE_GA_ID`)  | blank                                                                        | client's GA4 ID                      |
| Audience                  | Billy + client review                                                        | the public                           |

```
feature/xyz ──PR──▶ main ──auto──▶ staging.up.railway.app
                     │
                     └── git merge --ff-only ──▶ production ──auto──▶ client.com
```

`main` is **staging, not production.** It is always deployable, and it is never
the thing the public sees. Shipping to production is an explicit, separate act:
fast-forwarding the `production` branch.

---

## Admin dashboard storage

Both environments need a **Railway volume mounted at `/data`**, plus
`ADMIN_PASSWORD_HASH`, `SESSION_SECRET` and `DATA_DIR=/data`.

Without the volume the server writes to ephemeral container disk and **every
photo the client uploads is lost on the next deploy**. Create the volume before
the first deploy of this feature.

This is no longer silent. `server/store.js` refuses to boot rather than reseed
over the client's work in any of three cases:

| Refusal                                  | What it catches                                                                                                                                                                                 |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `assertDurableStorage()`                 | `RAILWAY_ENVIRONMENT` is set but no volume is mounted, or `DATA_DIR` points outside the mount — the store would be on ephemeral disk.                                                           |
| `content.json` unreadable                | The read failed with anything other than `ENOENT` (`EACCES`, `EIO`, a read-only or still-mounting volume). The file is probably intact and reseeding would write the template straight over it. |
| `content.json` missing, volume populated | The file is gone but `uploads/` or `backups/` have entries, so this is not a first boot. Seeding would orphan every uploaded image and republish the site as the template.                      |

The last two are the difference between a deploy that fails visibly and one that
comes up green having quietly replaced the client's site with the seed. A
refused boot leaves `/data` untouched — restore from `backups/` (below) and
redeploy.

Seeding still happens normally on a genuinely empty volume, and a `content.json`
that merely fails to parse is quarantined and reseeded as before.

Staging and production have separate volumes and therefore separate content.
Each self-seeds from the static content files on first boot, so a fresh
environment opens with the photo set that ships in the repo. The client edits
production — which is why local and staging show different images from the live
site, and why `yarn pull:prod` exists to mirror production's store into a local
`./.data` before you work on anything that renders it.

### What a push to `main` does to the client's data

Nothing, in the ordinary case. The container is rebuilt; the volume is not. On
boot the server reads the existing `content.json`, snapshots it to `backups/`,
and applies only the migration steps numbered above the store's own `version`.
A deploy where `SEED_VERSION` is unchanged runs no migration at all.

The care is needed when you **bump `SEED_VERSION`**: that step runs once against
the client's live store on the next deploy, and it cannot be re-run or undone.
Every existing step is deliberately one-shot and narrow — it fills blanks, or
rewrites only text still matching the old seed — so dashboard edits survive.
Two rules for any new step:

- **Never touch a row whose `src` starts with `/uploads/`.** Those are files the
  client uploaded and this repo cannot rebuild. `server/store.test.js` has a
  regression test that fails if a migration drops them.
- **Rehearse it first:** `yarn pull:prod` then `yarn dev`, which runs the
  migration against a copy of production's real store and shows you the result.

### Backups

Railway volumes are not backed up automatically, so the server keeps its own
rolling history. Every boot — which means every deploy and every restart —
copies the existing `content.json` to `/data/backups/content-<timestamp>.json`
_before_ any migration touches it, keeping the newest `BACKUP_RETENTION` (30)
snapshots. A deploy that migrates badly is therefore always recoverable.

A `content.json` that fails to parse is never overwritten by the reseed: it is
moved to `/data/content.corrupt-<timestamp>.json` first.

To restore a snapshot:

```sh
railway ssh --project ausflex_caravans --environment production
ls /data/backups                                    # newest last
cp /data/backups/content-<timestamp>.json /data/content.json
exit
```

Then restart the service so it reloads the file.

Backups cover the **metadata** — photo rows, captions, ordering, tours, van
copy. The uploaded image bytes live in `/data/uploads/` and are not snapshotted
(they are content-addressed and never rewritten, so only volume loss endangers
them). The dashboard's export link downloads the current `content.json` for an
off-Railway copy; tell the client to keep their original images regardless.

---

## Git branch model

- **`main`** — integration branch. Protected. Every merge lands on staging
  automatically. Keep it deployable at all times.
- **`production`** — release branch. Only ever receives **fast-forward** merges
  from `main`, so it is always an exact, older-or-equal snapshot of `main`.
  Never commit directly to it (except hotfixes, below).
- **`feature/*` / `fix/*`** — short-lived, PR into `main`. CI
  (`.github/workflows/ci.yml`) runs lint + format + test + build + Lighthouse on
  every branch and PR.

### Set up a new clone

```bash
git init && git add -A && git commit -m "Initial commit from Foundation template"
git branch -M main
git branch production            # production starts identical to main
git remote add origin git@github.com:<org>/<client>.git
git push -u origin main
git push -u origin production
```

On GitHub, protect both branches: require the `CI / build` check to pass, and
require a PR for `main`. `production` needs no PR — it only ever fast-forwards.

### Ship to production

```bash
git checkout production
git merge --ff-only main         # fails loudly if production has drifted
git push
git checkout main
```

`--ff-only` is the safety rail. If it refuses, `production` has commits `main`
doesn't (a hotfix that was never merged back) — fix that before releasing.

Tag releases if the client wants a changelog:
`git tag -a v1.2.0 -m "..." && git push --tags`.

### Hotfix a live bug while `main` has unfinished work

```bash
git checkout production && git checkout -b fix/urgent
# ...fix, commit, PR into production, CI green, merge...
git checkout main && git merge production      # merge it back so main stays ahead
```

Skipping the merge-back is what causes `--ff-only` to fail on the next release.

### Roll back

1. Fastest: Railway dashboard → production environment → Deployments → **Redeploy**
   a previous successful build (or `mcp__railway__list_deployments` to find it).
2. Then make git match reality: `git revert <bad-commit>` on `main`, and
   fast-forward `production` again. Never leave the branch and the live deploy
   out of sync.

---

## Railway setup (once per client)

Railway's default environment is already named `production` — keep it, and add
`staging` alongside it. One project, one service per environment.

1. Create the project and link the repo (see the `railway-deploy` skill).
2. Create the second environment: `mcp__railway__create_environment` with name
   `staging`.
3. Point each environment's service at its branch — Railway service →
   **Settings → Source → Branch**:
   - `staging` environment → branch `main`
   - `production` environment → branch `production`
4. Enable **Settings → Deploy → Wait for CI** on **both** services, so Railway
   only builds after GitHub Actions is green. Without this, a red build ships.
5. Set the env vars per environment (see the matrix below) — `mcp__railway__set_variables`
   after `mcp__railway__link_environment` for the environment you're targeting.
   Getting the wrong environment linked is the #1 way to leak the staging config
   into production; run `mcp__railway__list_variables` to confirm before deploying.
6. Generate a domain for staging (`mcp__railway__generate_domain`). Attach the
   client's custom domain to **production only**.

### Custom domains and `allowedHosts`

`vite.config.js` ships with `preview.allowedHosts: ['.up.railway.app']`, which
wildcards every Railway subdomain — staging needs no change. When you attach the
client's real domain to production, **append it literally**:

```js
allowedHosts: ['.up.railway.app', 'client.com', 'www.client.com'],
```

Vite's `preview` server rejects unknown Host headers, so a missing entry means a
blank 403 page on the live domain.

---

## Environment variables

All `VITE_*` vars are **build-time** — Vite inlines them into the bundle. Changing
one has no effect until the next build, so always redeploy after editing.

| Variable            | Staging                                          | Production              |
| ------------------- | ------------------------------------------------ | ----------------------- |
| `VITE_SITE_URL`     | the staging `*.up.railway.app` URL               | `https://client.com`    |
| `VITE_FORMSPREE_ID` | a **separate** Formspree form, or blank          | the client's real form  |
| `VITE_GA_ID`        | **blank** — never pollute client analytics       | client's `G-XXXXXXXXXX` |
| `VITE_SENTRY_DSN`   | optional; useful for catching errors pre-release | client's DSN if used    |
| `VITE_NOINDEX`      | `true` — keeps staging out of search             | **never set**           |

`VITE_SITE_URL` drives canonical/OG tags and the post-build rewrite of
`sitemap.xml` / `robots.txt` (`scripts/gen-seo-files.mjs`). Pointing staging at
the production domain would publish canonicals claiming to _be_ production — set
it to the staging URL.

Give staging its own Formspree form (or leave it blank) so test submissions never
hit the client's inbox.

---

## Keeping staging out of Google

Handled by the template — set `VITE_NOINDEX=true` on the **staging** environment
(and never on production). On the next build:

- `scripts/gen-seo-files.mjs` overwrites `dist/robots.txt` with
  `User-agent: *` / `Disallow: /`.
- `src/lib/seo.jsx` emits `<meta name="robots" content="noindex, nofollow" />`
  on every page of that build.

Like every `VITE_*` var it is **build-time** — setting it does nothing until the
next deploy. The production environment must **never** have it set. Verify
`curl https://client.com/robots.txt` still allows crawling after every
production deploy.

(Independently of this flag, the 404 page always carries `noindex` — an SPA 404
returns HTTP 200, so crawlers are told explicitly.)

---

## Per-environment verification

**After a staging deploy** — every route loads (`/`, `/services`, `/about`,
`/contact`, `/privacy`, `/terms`, a 404 path), contact form submits to the
staging form, no console errors.

**After a production deploy** — all of the above on the real domain, plus:
`sitemap.xml` and `robots.txt` show the real domain (not `example.com`), the
contact form reaches the client's inbox, GA4 registers a pageview, and Lighthouse
still clears performance ≥ 90 / SEO ≥ 95 / a11y ≥ 90.

Report results with evidence — URLs and observed behavior, not vibes.

---

## Alternative: manual promotion instead of a `production` branch

If a client's release cadence is ad hoc and a second branch is overhead, you can
run a single-branch setup instead: point **both** environments at `main`, turn
**off** auto-deploy on the production service, and promote by triggering a deploy
manually (`mcp__railway__deploy` or the dashboard's Deploy button).

Trade-off: you lose the git record of what's live. The `production` branch is the
default for exactly that reason — `git log production` answers "what's on the
client's site right now?" without opening Railway.
