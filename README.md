# Melkior Clergé Website

Bilingual website for Melkior Clergé, mortgage broker with Multi-Prêts.

The project is intentionally small: generated HTML, hand-written CSS and JavaScript, Cloudflare Workers, and a GitHub-backed admin editor.

## Quick Facts

- Production domain: `https://melkiorclerge.ca`
- Local dev URL: `http://127.0.0.1:8788`
- Main content file: `content/settings.json`
- Generated output: `dist/` (ignored, rebuilt locally and during deploy)
- Admin URL: `/admin/`
- Public contact sender: `consultation@melkiorclerge.ca`

## Stack

- Node.js build script
- Vanilla HTML, CSS, and JavaScript
- `marked` for Markdown rendering
- `libphonenumber-js` for phone validation
- Cloudflare Worker with static assets
- Cloudflare Turnstile for contact-form spam protection
- Cloudflare Email Sending for contact emails
- Cloudflare KV for contact-form health markers
- GitHub OAuth and GitHub Contents API for admin editing
- EasyMDE for admin-only Markdown editing

There is no frontend framework and no Tailwind package.

## Project Layout

```text
content/settings.json          Site content, localized copy, theme values
template.html                  Main public page template
template-legal.html            Privacy/legal page template
build.js                       Static build, sitemap, robots, headers
styles.css                     Public and shared styles
script.js                      Public site behavior
admin/                         Admin editor UI
workers/site/api/              Main Worker API route handlers
workers/site/middleware.js     Main Worker locale middleware
lib/                           Rendering, i18n, auth, email, security helpers
workers/site/index.js          Main website Worker entry
workers/email-health-check/    Scheduled weekly email-health Worker
assets/images/                 Source image assets
dist/                          Generated output, not committed
```

## Architecture

The main Worker serves generated files from `dist/` through the `ASSETS` binding. It also dispatches API routes, applies security headers, handles locale routing, admin auth, previews, and contact-form delivery.

This is a Cloudflare Workers Static Assets deployment, not a Cloudflare Pages Functions project. The main Worker entrypoint and its route modules live under `workers/site/`; there is intentionally no top-level `functions/` directory.

The admin area edits `content/settings.json` and image files through GitHub. Publishing from the admin commits changes to GitHub; Cloudflare then redeploys the site.

The weekly email-health Worker is separate from the public site. It has no public route. It runs every Monday at 15:00 UTC, checks Cloudflare Email Service health and shared `CONTACT_HEALTH` KV markers, and sends an alert only when action is needed.

## Public Routes

```text
/fr/
/en/
/fr/politique-de-confidentialite/
/en/privacy-policy/
/fr/mentions-legales/
/en/legal-notice/
```

The root path `/` redirects using the locale cookie, `Accept-Language`, then French as the fallback.

## Local Development

Install dependencies:

```bash
npm install
```

Create local environment values:

```bash
cp .dev.vars.example .dev.vars
```

Fill in `.dev.vars`:

```text
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
ADMIN_SESSION_SECRET
ADMIN_COOKIE_SECURE=false
ADMIN_PUBLIC_ORIGIN=http://127.0.0.1:8788
TURNSTILE_SITE_KEY
TURNSTILE_SECRET
CONTACT_DESTINATION
EMAIL_FAILURE_WEBHOOK_URL
```

Build generated files:

```bash
npm run build
```

Start local Wrangler dev:

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:8788
```

## Content Editing

Most site content is in `content/settings.json`:

- `shared`: common contact details, image paths, social links, business metadata
- `theme`: color values injected into generated pages
- `locales.fr-CA`: French Canadian copy
- `locales.en-CA`: Canadian English copy

After manual content edits, run:

```bash
npm run build
```

Commit source files only. Do not commit `dist/`.

## Admin

The admin area uses GitHub OAuth. Login is allowed only for GitHub users with `admin`, `maintain`, or `write` access to:

```text
mclerge01/website-melkior
```

Admin writes require:

- valid admin session
- CSRF token
- current repository write permission

Admin previews render draft content without publishing. Image uploads are prepared in the browser, then uploaded to GitHub when the admin user clicks publish.

Uploaded images are stored under:

```text
assets/images/
```

Raster images are converted to responsive WebP variants. SVG and ICO files are preserved after validation.

## Contact Form And Email

The public contact form posts to:

```text
/api/contact
```

The handler validates required fields, verifies Turnstile, sanitizes input, and sends email through Cloudflare Email Sending from:

```text
consultation@melkiorclerge.ca
```

Set `CONTACT_DESTINATION` to the private final recipient mailbox, not to the public alias. Do not commit the destination mailbox in source, generated files, or `wrangler.toml`.

Optional failure alerts can be sent through:

```text
EMAIL_FAILURE_WEBHOOK_URL
```

The shared `CONTACT_HEALTH` KV namespace stores log-safe contact-form failure markers for the weekly health check. It does not store visitor names, visitor emails, subjects, or message bodies.

## Weekly Email Health Check

For local testing, create:

```bash
cp workers/email-health-check/.dev.vars.example workers/email-health-check/.dev.vars
```

Health-check Worker secrets:

```text
CONTACT_DESTINATION
CLOUDFLARE_ANALYTICS_TOKEN
EMAIL_HEALTH_CHECK_RECIPIENT
EMAIL_FAILURE_WEBHOOK_URL
```

`CONTACT_DESTINATION` is required. `CLOUDFLARE_ANALYTICS_TOKEN` needs Cloudflare Analytics Read permission for the `melkiorclerge.ca` zone.

## Deployment

Build first:

```bash
npm run build
```

Deploy the main website Worker:

```bash
npx wrangler deploy --config wrangler.toml
```

Deploy the weekly email-health Worker:

```bash
npx wrangler deploy --config workers/email-health-check/wrangler.toml
```

Required production secrets for the main Worker:

```bash
npx wrangler secret put GITHUB_CLIENT_SECRET --config wrangler.toml
npx wrangler secret put ADMIN_SESSION_SECRET --config wrangler.toml
npx wrangler secret put TURNSTILE_SECRET --config wrangler.toml
npx wrangler secret put CONTACT_DESTINATION --config wrangler.toml
```

Required production secrets for the health-check Worker:

```bash
npx wrangler secret put CONTACT_DESTINATION --config workers/email-health-check/wrangler.toml
npx wrangler secret put CLOUDFLARE_ANALYTICS_TOKEN --config workers/email-health-check/wrangler.toml
```

Optional secrets:

```bash
npx wrangler secret put EMAIL_FAILURE_WEBHOOK_URL --config wrangler.toml
npx wrangler secret put EMAIL_HEALTH_CHECK_RECIPIENT --config workers/email-health-check/wrangler.toml
npx wrangler secret put EMAIL_FAILURE_WEBHOOK_URL --config workers/email-health-check/wrangler.toml
```

## Verification

Run before committing meaningful changes:

```bash
npm run build
node --check build.js workers/site/index.js workers/site/middleware.js workers/site/api/contact.js workers/site/api/preview.js workers/email-health-check/index.js lib/contact-health.mjs lib/email-health-check.mjs lib/mime-email.mjs lib/security-headers.mjs script.js admin/admin.js
npx wrangler deploy --dry-run --config wrangler.toml
npx wrangler deploy --dry-run --config workers/email-health-check/wrangler.toml
git diff --check
```

Also verify in a browser when relevant:

- `/fr/` and `/en/` render correctly
- language switcher maps equivalent pages
- contact form validates inline
- admin login reaches GitHub OAuth
- admin preview renders draft changes
- legal and privacy pages render correctly

## Operational Notes

- Never commit `.dev.vars`, `.env`, `.wrangler/`, local logs, private mailbox destinations, OAuth secrets, Turnstile secrets, or API tokens.
- Keep `consultation@melkiorclerge.ca` aligned in public content, contact-email code, and the `SEND_EMAIL` binding.
- Keep Cloudflare Managed Rules and DDoS protection enabled.
- Recommended WAF rate limits:
  - `/api/contact*` POST: block or challenge more than 10 requests per minute per IP.
  - `/api/auth/*` GET/POST: block more than 30 requests per minute per IP.
  - `/api/admin/*`: block more than 120 requests per minute per IP.
- If contact emails deliver but land in spam, check `CONTACT_DESTINATION`, Cloudflare Email Sending analytics, SPF/DKIM records, and DMARC reports before changing form logic.
