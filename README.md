# Melkior Clergé Website

Bilingual, lightweight website for Melkior Clergé, mortgage broker with Multi-Prêts.

The site is intentionally small and framework-free: static HTML generated from JSON content, hand-written CSS, vanilla JavaScript, Cloudflare Pages Functions, and a GitHub-backed admin area.

## Stack

- Node.js build script
- Vanilla HTML, CSS, and JavaScript
- `marked` for build-time Markdown rendering
- Cloudflare Pages Functions for routing, admin auth, previews, and contact form handling
- Cloudflare Turnstile for contact form anti-spam verification
- Cloudflare Email Routing Worker for sending contact emails
- GitHub OAuth for admin login

No frontend framework, no Tailwind package, and no browser-side libraries are used.

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
fr/, en/                       Generated localized public pages
index.html                     Generated root language fallback page
sitemap.xml, robots.txt        Generated SEO files
```

The generated public HTML is committed because Cloudflare Pages serves the repository directly.

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

`.dev.vars` must never be committed.

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

Then commit both the source content and generated HTML.

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

The Pages Function validates required fields, verifies Turnstile server-side, sanitizes values, and sends an email through the `EMAIL_WORKER` binding.

Local dev can run without a connected email worker, but full delivery testing requires Cloudflare bindings and valid `.dev.vars` values.

## Deployment

Recommended Cloudflare Pages build command:

```bash
npm run build
```

Recommended output directory:

```text
.
```

The repository contains the generated files Cloudflare serves.

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
- Keep generated HTML in sync with templates and content.
