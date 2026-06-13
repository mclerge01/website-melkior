# Melkior Clergé Website

Bilingual website for Melkior Clergé, mortgage broker with Multi-Prêts.

The project is intentionally small: generated HTML, hand-written CSS and JavaScript, Cloudflare Workers, and a GitHub-backed admin editor.

## Quick Facts

- Admin URL: `/admin/`
- Generated output: `dist/` (ignored, rebuilt locally and during deploy)
- Local dev URL: `http://127.0.0.1:8788`
- Main content file: `content/settings.json`
- Production domain: `https://melkiorclerge.ca`
- Public contact sender: `consultation@melkiorclerge.ca`

## Stack

- Cloudflare Email Sending for contact emails
- Cloudflare KV for contact-form health markers
- Cloudflare Turnstile for contact-form spam protection
- Cloudflare Worker with static assets
- EasyMDE for admin-only Markdown editing
- GitHub OAuth and GitHub Contents API for admin editing
- `libphonenumber-js` for phone validation
- `marked` for Markdown rendering
- Node.js build script
- Vanilla HTML, CSS, and JavaScript

There is no frontend framework and no Tailwind package.

## Project Layout

```text
admin/                         Admin editor UI
assets/images/                 Source image assets
build.js                       Static build, sitemap, robots, headers
content/settings.json          Site content, localized copy, theme values
dist/                          Generated output, not committed
lib/                           Rendering, i18n, auth, email, security helpers
script.js                      Public site behavior
styles.css                     Public and shared styles
template-legal.html            Privacy/legal page template
template.html                  Main public page template
workers/email-health-check/    Scheduled weekly email-health Worker
workers/website-melkior/       Main website Worker entry, API routes, middleware
```

## Architecture

- `admin/`: GitHub-backed editor for `content/settings.json` and image files. Publishing commits changes to GitHub; Cloudflare then redeploys the site.
- `workers/email-health-check/`: separate scheduled Worker with no public route. It runs every Monday at 15:00 UTC, checks Cloudflare Email Service health and shared `CONTACT_HEALTH` KV markers, and sends an alert only when action is needed.
- `workers/website-melkior/`: main Cloudflare Workers Static Assets Worker. It serves `dist/` through the `ASSETS` binding, dispatches API routes, applies security headers, handles locale routing, admin auth, previews, and contact-form delivery.

Each Worker lives under `workers/<wrangler-name>/`. This is not a Cloudflare Pages Functions project, so there is intentionally no top-level `functions/` directory.

## Public Routes

```text
/
/en/
/en/legal-notice/
/en/privacy-policy/
/fr/
/fr/mentions-legales/
/fr/politique-de-confidentialite/
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
ADMIN_COOKIE_SECURE=false
ADMIN_PUBLIC_ORIGIN=http://127.0.0.1:8788
ADMIN_SESSION_SECRET
CONTACT_DESTINATION
EMAIL_FAILURE_WEBHOOK_URL
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
TURNSTILE_SECRET
TURNSTILE_SITE_KEY
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

- `locales.en-CA`: Canadian English copy
- `locales.fr-CA`: French Canadian copy
- `shared`: common contact details, image paths, social links, business metadata
- `theme`: color values injected into generated pages

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

- CSRF token
- current repository write permission
- valid admin session

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
CLOUDFLARE_ANALYTICS_TOKEN
CONTACT_DESTINATION
EMAIL_FAILURE_WEBHOOK_URL
EMAIL_HEALTH_CHECK_RECIPIENT
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
npx wrangler secret put ADMIN_SESSION_SECRET --config wrangler.toml
npx wrangler secret put CONTACT_DESTINATION --config wrangler.toml
npx wrangler secret put GITHUB_CLIENT_SECRET --config wrangler.toml
npx wrangler secret put TURNSTILE_SECRET --config wrangler.toml
```

Required production secrets for the health-check Worker:

```bash
npx wrangler secret put CLOUDFLARE_ANALYTICS_TOKEN --config workers/email-health-check/wrangler.toml
npx wrangler secret put CONTACT_DESTINATION --config workers/email-health-check/wrangler.toml
```

Optional secrets:

```bash
npx wrangler secret put EMAIL_FAILURE_WEBHOOK_URL --config wrangler.toml
npx wrangler secret put EMAIL_FAILURE_WEBHOOK_URL --config workers/email-health-check/wrangler.toml
npx wrangler secret put EMAIL_HEALTH_CHECK_RECIPIENT --config workers/email-health-check/wrangler.toml
```

## Verification

Run before committing meaningful changes:

```bash
npm run build
node --test tests/*.mjs tests/*.js
node --check admin/admin.js
node --check build.js
node --check lib/contact-health.mjs
node --check lib/email-health-check.mjs
node --check lib/mime-email.mjs
node --check lib/security-headers.mjs
node --check script.js
node --check workers/email-health-check/index.js
node --check workers/website-melkior/api/contact.js
node --check workers/website-melkior/api/preview.js
node --check workers/website-melkior/index.js
node --check workers/website-melkior/middleware.js
npx wrangler deploy --dry-run --config wrangler.toml
npx wrangler deploy --dry-run --config workers/email-health-check/wrangler.toml
git diff --check
```

Also verify in a browser when relevant:

- admin login reaches GitHub OAuth
- admin preview renders draft changes
- contact form validates inline
- language switcher maps equivalent pages
- legal and privacy pages render correctly
- `/fr/` and `/en/` render correctly

## Operational Notes

Never commit:

```text
.dev.vars
.env
.wrangler/
API tokens
local logs
OAuth secrets
private mailbox destinations
Turnstile secrets
```

- Keep `consultation@melkiorclerge.ca` aligned in public content, contact-email code, and the `SEND_EMAIL` binding.
- Keep Cloudflare Managed Rules and DDoS protection enabled.
- If contact emails deliver but land in spam, check `CONTACT_DESTINATION`, Cloudflare Email Sending analytics, SPF/DKIM records, and DMARC reports before changing form logic.

Recommended WAF rate limits:

```text
/api/admin/*        block more than 120 requests per minute per IP
/api/auth/*         block more than 30 requests per minute per IP
/api/contact* POST  block or challenge more than 10 requests per minute per IP
```
