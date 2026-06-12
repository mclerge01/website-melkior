# Melkior Clergé Website

Bilingual, lightweight website for Melkior Clergé, mortgage broker with Multi-Prêts.

The site is intentionally small and framework-free: static HTML generated from JSON content, hand-written CSS, vanilla JavaScript, Cloudflare Worker handlers, and a GitHub-backed admin area.

## Stack

- Node.js build script
- Vanilla HTML, CSS, and JavaScript
- `marked` for build-time Markdown rendering
- Cloudflare Worker with static assets for routing, admin auth, previews, security headers, and contact form handling
- Cloudflare Turnstile for contact form anti-spam verification
- Cloudflare Email Sending for contact emails
- Fouita Instagram widget embed for the media section
- GitHub OAuth for admin login
- EasyMDE for admin-only Markdown editing

No frontend framework or Tailwind package is used. The public website loads pinned CDN assets only where needed: Cloudflare Turnstile and `intl-tel-input` for phone entry. The admin panel loads pinned EasyMDE assets for Markdown editing.

## Production Architecture

The public website is a Cloudflare Worker serving generated static assets from `dist/` through the `ASSETS` binding. `run_worker_first = ["/*"]` in `wrangler.toml` sends every website request through `worker/index.js` before static asset fallback, so security headers and route-specific CSP are applied consistently to public pages, admin pages, API responses, and static files.

API handlers still live under `functions/` using a Pages Function-compatible shape, but they are dispatched by the Worker. Contact-form email is sent directly from the main Worker through the Cloudflare Email Sending `SEND_EMAIL` binding. The previous separate email relay service binding is intentionally removed.

A separate scheduled-only Worker lives under `workers/email-health-check/`. It has no public route and exists only to run the weekly Cloudflare Email Service health check. Keeping that monitor separate means the public website Worker does not carry the Cloudflare Analytics API token needed to query Email Service delivery and routing analytics.

Both Workers share the `CONTACT_HEALTH` Workers KV namespace. The public website Worker writes a short, log-safe record when the contact form has a website-side send/configuration failure. The scheduled Worker reads those records in its weekly check. Records contain counts, reason codes, domains, and sizes only; they do not store visitor names, visitor email addresses, subjects, or message bodies.

CSP and static fallback header rules are authored in `lib/security-headers.mjs`. `npm run build` generates `dist/_headers` from that module because Cloudflare requires emitted `_headers` header values to stay on one line.

## Project Structure

```text
content/settings.json          Shared content, theme values, and localized copy
template.html                  Main public page template
template-legal.html            Privacy/legal page template
build.js                       Static page, sitemap, and robots generator
styles.css                     Hand-written utility/component CSS
script.js                      Public navigation, language, calculator, and form behavior
admin/                         Admin editor UI
functions/                     Worker-dispatched API handlers
lib/                           Rendering, i18n, admin auth, and security helpers
workers/email-health-check/    Scheduled-only Email Service monitoring Worker
CONTACT_HEALTH KV              Contact-form failure markers shared by both Workers
dist/                          Ignored build output served by the Worker ASSETS binding
```

Generated public HTML, sitemap, robots file, `_headers`, copied assets, and the admin shell are written to `dist/` by `npm run build`. They are not committed.

## Local Development

Install dependencies:

```bash
npm install
```

Build static files:

```bash
npm run build
```

Run the Wrangler dev server:

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
CONTACT_DESTINATION
SEND_EMAIL binding
```

Optional alerting value:

```text
EMAIL_FAILURE_WEBHOOK_URL
```

The public contact/sender alias is:

```text
consultation@melkiorclerge.ca
```

This is public and is not configured through `.dev.vars`. Keep it aligned in `content/settings.json`, `functions/api/contact.js`, and the `allowed_sender_addresses` entry for the `SEND_EMAIL` binding in `wrangler.toml`.

For the main website Worker, the private destination mailbox is configured only as a local `.dev.vars` value and a Cloudflare Worker secret:

```text
CONTACT_DESTINATION=<final recipient mailbox; never the public alias>
EMAIL_FAILURE_WEBHOOK_URL=<optional HTTPS webhook for delivery failures>
```

`.dev.vars` must never be committed.

For local testing of the scheduled health-check Worker, copy `workers/email-health-check/.dev.vars.example` to `workers/email-health-check/.dev.vars` and fill in:

```text
CONTACT_DESTINATION=<final recipient mailbox; never the public alias>
CLOUDFLARE_ANALYTICS_TOKEN=<API token with Analytics Read permission>
EMAIL_HEALTH_CHECK_RECIPIENT=<optional alert recipient override; defaults to CONTACT_DESTINATION>
EMAIL_FAILURE_WEBHOOK_URL=<optional HTTPS webhook for alert-delivery failures>
```

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

The Worker-dispatched handler validates required fields, verifies Turnstile server-side, sanitizes values, and schedules delivery from `consultation@melkiorclerge.ca` through the `SEND_EMAIL` binding in the background. The visitor receives success as soon as that delivery is queued by the website, not after the destination mailbox places the message in the inbox.

Set `CONTACT_DESTINATION` to the final recipient mailbox, not to the Cloudflare-routed public alias. Sending to the alias first adds an Email Routing forwarding hop before the message reaches the real mailbox, which can make downstream spam filters more suspicious. The destination mailbox must never be added to public content, committed source, `wrangler.toml` vars, or generated `dist/` files.

If background delivery fails, the Worker logs `contact_email_delivery_failed` and rethrows through `ctx.waitUntil` so the failure is visible in Cloudflare Workers Logs/Observability. For direct notification outside the email path, configure an HTTPS webhook secret on the main site Worker:

```bash
npx wrangler secret put EMAIL_FAILURE_WEBHOOK_URL --config wrangler.toml
```

Use a Slack, Discord, Google Chat, PagerDuty, or monitoring webhook URL. The Worker posts both `text` and `content` fields so common webhook receivers can notify Melkior even when email delivery itself is broken.

Local dev can run without a connected email binding, but full delivery testing requires the Cloudflare `SEND_EMAIL` binding and valid `.dev.vars` values. There is no separate email relay Worker to deploy or bind.

### Weekly email health check

The separate `email-health-check` Worker has a weekly scheduled health check every Monday at 15:00 UTC. It queries Cloudflare Email Service analytics and the shared `CONTACT_HEALTH` KV namespace for the previous seven UTC dates. It sends an email only when there is something actionable: contact-form website errors, outbound delivery failures, rejected/failed sends, inbound routing rejections/drops/errors, a query failure, or missing monitoring configuration. A clean week writes a `weekly_email_health_check_ok` log entry and sends no email.

When an alert is sent, it goes to `EMAIL_HEALTH_CHECK_RECIPIENT` when set, otherwise `CONTACT_DESTINATION`. The email is written in French for a non-technical client: it says this is a website email warning, gives easy counts, and tells Melkior to forward it to the website developer if he sees it.

It includes aggregate counts only:

- contact-form website-side errors
- website emails that could not be sent or delivered
- forwarded emails that were blocked, dropped, or could not be delivered
- short technical details for the website developer

It deliberately does not include visitor names, email addresses, subjects, or message bodies. Cloudflare Email Service can report whether a message was delivered to the recipient mail server, bounced, rejected, or failed; it cannot see whether a successfully delivered message landed in the inbox or spam folder.

To enable the weekly health check fully, set its secrets on the health-check Worker:

```bash
npx wrangler secret put CONTACT_DESTINATION --config workers/email-health-check/wrangler.toml
npx wrangler secret put CLOUDFLARE_ANALYTICS_TOKEN --config workers/email-health-check/wrangler.toml
```

Optional health-check Worker secrets:

```bash
npx wrangler secret put EMAIL_HEALTH_CHECK_RECIPIENT --config workers/email-health-check/wrangler.toml
npx wrangler secret put EMAIL_FAILURE_WEBHOOK_URL --config workers/email-health-check/wrangler.toml
```

The analytics token needs Cloudflare Analytics Read permission for the `melkiorclerge.ca` zone. The non-secret `CLOUDFLARE_ZONE_ID` is tracked in `workers/email-health-check/wrangler.toml`. `CONTACT_DESTINATION` is declared as a required Worker secret so deploys cannot publish a monitor with nowhere to send alerts. `CLOUDFLARE_ANALYTICS_TOKEN` is intentionally not deploy-blocking: if it is missing, the weekly scheduled job sends an action-needed configuration alert instead of silently failing.

DMARC reporting is separate from the contact-form health check. The health-check Worker watches emails sent or routed by Cloudflare Email Service. DMARC reports are for a different question: whether other mail providers are seeing anyone try to fake email from `melkiorclerge.ca`. The current Cloudflare DNS record already uses `p=reject` and sends those reports to a Cloudflare-managed reporting address, so there is no extra website code to add. Review those reports in **Cloudflare > Email > DMARC Management** when checking for spoofing or mail-authentication problems.

### Cloudflare security rules

In **Cloudflare > Security > WAF > Rate limiting rules**, configure conservative burst limits:

1. Contact form: match `https://melkiorclerge.ca/api/contact*`, method `POST`, block or managed-challenge after more than 10 requests per minute from the same IP for 10 minutes.
2. GitHub auth: match `https://melkiorclerge.ca/api/auth/*`, methods `GET` and `POST`, block after more than 30 requests per minute from the same IP for 10 minutes.
3. Admin API probing: match `https://melkiorclerge.ca/api/admin/*`, all methods, block after more than 120 requests per minute from the same IP for 5 minutes.

Keep Cloudflare Managed Rules and DDoS L7 rulesets enabled. Cloudflare Access is intentionally not part of this setup; the app itself enforces GitHub repository write access before creating admin sessions.

### Deliverability checks

If contact-form messages reach the destination mailbox but land in spam, check the sending reputation and authentication path before changing form logic:

1. Confirm `CONTACT_DESTINATION` points directly to the final mailbox rather than the `consultation@melkiorclerge.ca` public/routing alias.
2. In Cloudflare, open **Compute & AI > Email Service > Email Sending > Analytics** for `melkiorclerge.ca` and review delivery status, bounces, complaints, spam flags, and authentication results.
3. Confirm Email Sending DNS records are present, especially the `cf-bounce` SPF/DKIM records Cloudflare shows for the sending domain. Email Routing records alone are not enough for best outbound deliverability.
4. Keep DMARC at `p=reject`; if legitimate mail starts failing, review the Cloudflare DMARC reports and the Email Sending SPF/DKIM records before relaxing the policy.
5. Ask the recipient mailbox owner to mark one legitimate contact-form message as "not spam" and add `consultation@melkiorclerge.ca` to trusted senders while domain reputation warms up.

## Deployment

Build the static assets first:

```bash
npm run build
```

Then deploy the Worker and static assets:

```bash
npx wrangler deploy --config wrangler.toml
```

Deploy the scheduled health-check Worker separately:

```bash
npx wrangler deploy --config workers/email-health-check/wrangler.toml
```

Required production secrets for the main website Worker:

```bash
npx wrangler secret put GITHUB_CLIENT_SECRET --config wrangler.toml
npx wrangler secret put ADMIN_SESSION_SECRET --config wrangler.toml
npx wrangler secret put TURNSTILE_SECRET --config wrangler.toml
npx wrangler secret put CONTACT_DESTINATION --config wrangler.toml
```

Production secrets for the health-check Worker:

```bash
npx wrangler secret put CONTACT_DESTINATION --config workers/email-health-check/wrangler.toml
npx wrangler secret put CLOUDFLARE_ANALYTICS_TOKEN --config workers/email-health-check/wrangler.toml
```

`CONTACT_DESTINATION` must be set before deploy because the monitor needs an alert recipient. `CLOUDFLARE_ANALYTICS_TOKEN` is needed for Email Service analytics, but the Worker can still deploy without it and will send a configuration warning until it is added.

`EMAIL_FAILURE_WEBHOOK_URL` is an optional secret on both Workers. `EMAIL_HEALTH_CHECK_RECIPIENT` is an optional secret on the health-check Worker. `GITHUB_CLIENT_ID`, `TURNSTILE_SITE_KEY`, the `CONTACT_HEALTH` KV namespace id, and the allowed public sender address are non-secret values in `wrangler.toml`; `CLOUDFLARE_ZONE_ID` is a non-secret value in `workers/email-health-check/wrangler.toml`.

The `secrets.required` entries in each Wrangler config list required secret names only. Their values are encrypted Worker secrets and must not be stored in `wrangler.toml`.

Cloudflare serves the generated `dist/` directory through the Worker `ASSETS` binding. The repository tracks templates, content, functions, assets, and admin source files only.

## Verification Checklist

Before committing meaningful changes:

```bash
npm run build
node --check build.js worker/index.js workers/email-health-check/index.js functions/api/contact.js lib/contact-health.mjs lib/email-health-check.mjs lib/mime-email.mjs lib/security-headers.mjs script.js
npx wrangler deploy --dry-run --config wrangler.toml
npx wrangler deploy --dry-run --config workers/email-health-check/wrangler.toml
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
