# Melkior Clergé — Website

Bilingual static website for Melkior Clergé, mortgage broker with Multi-Prêts.

The project is intentionally lightweight:

- Vanilla HTML/CSS/JS
- No frontend framework
- No Tailwind package
- Build-time JSON rendering
- Cloudflare Pages Functions for routing, admin, preview, and contact form
- Cloudflare Email Routing Worker for contact email delivery

## Architecture

```text
content/settings.json      Editable shared and localized content
template.html              Public home page template
template-legal.html        Localized legal page template
build.js                   Generates /fr/, /en/, legal pages, sitemap, robots
styles.css                 Hand-written Tailwind-style utility system
script.js                  Public navigation, calculator, language, form behavior
admin/                     GitHub OAuth content editor
functions/                 Cloudflare Pages Functions
workers/email-sender/      Cloudflare Email Routing Worker
```

## Local Development

```bash
npm install
npm run build
npm run dev
```

The local Cloudflare Pages dev server runs on `http://localhost:8788`.

Copy `.dev.vars.example` to `.dev.vars` and fill in the OAuth, Turnstile, and email values for full admin/contact testing.

## Bilingual URLs

```text
/fr/
/en/
/fr/politique-de-confidentialite/
/en/privacy-policy/
/fr/mentions-legales/
/en/legal-notice/
```

The root path `/` redirects based on `melkior_locale`, then `Accept-Language`. Any French variant routes to `/fr/`; any English variant routes to `/en/`; everything else defaults to `/fr/`.

## Admin Login

The admin uses GitHub OAuth. Only users with `admin`, `maintain`, or `write` access to `mclerge01/website-melkior` can log in. Non-contributors are rejected before a session is created.

## Required Cloudflare Values

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
