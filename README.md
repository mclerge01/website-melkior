# Melkior Clergé Website

Bilingual, lightweight website for Melkior Clergé, mortgage broker with Multi-Prêts.

The site is intentionally small and framework-free: static HTML generated from JSON content, hand-written CSS, vanilla JavaScript, Cloudflare Pages Functions, and a GitHub-backed admin area.

## Stack

- Node.js build script
- Vanilla HTML, CSS, and JavaScript
- `marked` for build-time Markdown rendering
- Cloudflare Pages Functions for routing, admin auth, previews, and contact form handling
- Cloudflare Turnstile for contact form anti-spam verification
- Cloudflare Email Sending Worker for contact emails
- Fouita Instagram widget embed for the media section
- GitHub OAuth for admin login
- EasyMDE for admin-only Markdown editing

No frontend framework or Tailwind package is used. The public website loads pinned CDN assets only where needed: Cloudflare Turnstile and `intl-tel-input` for phone entry. The admin panel loads pinned EasyMDE assets for Markdown editing.

## Project Structure

```text
content/settings.json          Shared content, theme values, and localized copy
template.html                  Main public page template
template-legal.html            Privacy/legal page template
build.js                       Static page, sitemap, and robots generator
styles.css                     Hand-written utility/component CSS
script.js                      Public navigation, language, calculator, and form behavior
admin/                         Admin editor UI
functions/                     Cloudflare Pages Functions
lib/                           Rendering, i18n, and admin auth helpers
workers/email-sender/          Cloudflare Email Routing Worker
dist/                          Ignored build output served by Cloudflare Pages
```

Generated public HTML, sitemap, robots file, copied assets, and the admin shell are written to `dist/` by `npm run build`. They are not committed.

## Local Development

Install dependencies:

```bash
npm install
```

Build static files:

```bash
npm run build
```

Run the Cloudflare Pages dev server:

```bash
npm run dev
```

The local site runs at:

```text
http://127.0.0.1:8788
```

## Environment Variables

Copy `.dev.vars.example` to `.dev.vars` for local development:

```bash
cp .dev.vars.example .dev.vars
```

Required values:

```text
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
ADMIN_SESSION_SECRET
TURNSTILE_SITE_KEY
TURNSTILE_SECRET
CONTACT_EMAIL
CONTACT_DESTINATION
EMAIL_WORKER service binding
```

Optional alerting value:

```text
EMAIL_FAILURE_WEBHOOK_URL
```

For the public contact identity, use:

```text
CONTACT_EMAIL=consultation@melkiorclerge.ca
CONTACT_DESTINATION=<set as a local `.dev.vars` value and a Cloudflare Pages secret>
EMAIL_FAILURE_WEBHOOK_URL=<optional HTTPS webhook for delivery failures>
```

`.dev.vars` must never be committed.

The Instagram media section uses the Fouita iframe widget URL saved in `content/settings.json` under `shared.social.instagram_embed_url`. The public JavaScript delays loading the iframe until a likely human visitor scrolls or interacts with the page, so crawlers do not spend widget views.

## Bilingual Routing

Generated public routes:

```text
/fr/
/en/
/fr/politique-de-confidentialite/
/en/privacy-policy/
/fr/mentions-legales/
/en/legal-notice/
```

The root path `/` redirects by checking:

1. `melkior_locale` cookie
2. `Accept-Language`
3. French fallback

Any French locale variant routes to `/fr/`; any English locale variant routes to `/en/`.

## Content Editing

Most public content lives in `content/settings.json`:

- `shared`: contact details, image URLs, shared business metadata
- `theme`: CSS variables injected into generated pages
- `locales.fr-CA`: French Canadian content
- `locales.en-CA`: Canadian English content

After editing content:

```bash
npm run build
```

Then commit the edited source files only. The generated `dist/` folder is ignored and recreated during deployment.

## Admin Image Uploads

The admin panel stores uploaded images in GitHub under:

```text
assets/images/
```

The normal admin flow matches `styaud/website-audrey-s`: choosing an image prepares a local preview and queues the file; clicking **Publier** uploads the queued images to GitHub before saving `content/settings.json`.

Image handling rules:

- JPG, PNG, WebP, AVIF, BMP, and other browser-decodable raster images are resized if needed and converted to WebP in the browser before upload.
- SVG and ICO files are preserved.
- The server still validates every upload before committing to GitHub: safe file name, allowed extension, size limit, image signature, and unsafe SVG markup rejection.
- SVG uploads reject scripts, event handlers, external references, `foreignObject`, embedded images, and similar active content.

## Admin Login

The admin area uses GitHub OAuth.

Login is allowed only for GitHub users with `admin`, `maintain`, or `write` access to:

```text
mclerge01/website-melkior
```

Non-contributors are rejected before a session is created. Write actions require a valid session, CSRF token, and a fresh permission check.

## Contact Form

The public contact form posts to:

```text
/api/contact
```

The Pages Function validates required fields, verifies Turnstile server-side, sanitizes values, and schedules the handoff from `consultation@melkiorclerge.ca` to the `EMAIL_WORKER` binding in the background. The visitor receives success as soon as that handoff is queued by the website, not after Cloudflare Email Sending finishes delivery.

If handoff or background delivery fails, the Workers log `contact_email_handoff_failed` or `email_delivery_failed` and rethrow through `ctx.waitUntil` so the failure is visible in Cloudflare Workers Logs/Observability. For direct notification outside the email path, configure the same HTTPS webhook secret on both the main site Worker and the `email-sender` Worker:

```bash
npx wrangler secret put EMAIL_FAILURE_WEBHOOK_URL --config wrangler.toml
npx wrangler secret put EMAIL_FAILURE_WEBHOOK_URL --config workers/email-sender/wrangler.toml
```

Use a Slack, Discord, Google Chat, PagerDuty, or monitoring webhook URL. The Worker posts both `text` and `content` fields so common webhook receivers can notify Melkior even when email delivery itself is broken.

Local dev can run without a connected email worker, but full delivery testing requires Cloudflare bindings and valid `.dev.vars` values.

## Deployment

Recommended Cloudflare Pages build command:

```bash
npm run build
```

Recommended output directory:

```text
dist
```

Cloudflare Pages should serve the generated `dist/` directory. The repository tracks templates, content, functions, assets, and admin source files only.

## Verification Checklist

Before committing meaningful changes:

```bash
npm run build
node --check script.js
git diff --check
```

Also verify:

- `/fr/` and `/en/` render correctly
- language switcher maps equivalent pages
- contact form validates inline
- admin login reaches GitHub OAuth
- legal and privacy pages render with the shared footer/header

## Notes

- Do not commit secrets, `.dev.vars`, `.wrangler/`, or local logs.
- Avoid adding frontend dependencies unless there is a clear reason.
- Run `npm run build` before commits that change templates or content.
