# Joey Emond Reference Audit

Reference URL: https://www.joeyemond.ca/

Captured screenshots:

- `.wrangler/joey-audit/joey-desktop/*.png`
- `.wrangler/joey-audit/joey-mobile/*.png`

## Global Design Language

Joey's site is editorial and premium rather than dashboard-like. The palette is mostly near-black, warm off-white, wine red, and muted gold. The black areas are not flat: they use image overlays, radial glows, small gold particles, thin dividers, and low-opacity borders. The light areas are warm, almost paper-like, and use a very subtle pattern or texture.

Typography is a major part of the identity. Large headings combine a heavy geometric sans with a serif italic accent. Gold words are used sparingly to create hierarchy. Eyebrows are small, uppercase, letter-spaced, and gold. Body copy is compact, confident, and mostly one to two lines per block.

Motion is quiet but present. The page uses scroll reveals, hover scale on buttons/cards, nav color transition from transparent to white, horizontal carousel motion, and interactive testimonial pills. The site feels dynamic because elements shift in depth, opacity, and shadow, not because of loud animation.

## Header

At the top of the hero, the nav is transparent, over the dark image. Text and logo are white/gold. The logo is not just a monogram: it reads as a lockup with the broker name plus a Multi-Prets logo separated by a thin vertical divider. Navigation links are uppercase, small, and spaced widely. The CTA is a pill on the far right; on the transparent state it is glassy with white border/backdrop blur, and after scrolling it becomes a wine button on a white nav.

On mobile, the header stays minimal: broker name on the left, hamburger on the right. There is no heavy top card. The menu icon is white over the image.

## Hero

The hero is full viewport height and cinematic. A real architectural/city image fills the entire background. A dark overlay makes text readable while retaining visible building texture. The broker portrait is not a rectangular card: it is a large circular medallion on the right, with a wine-red background behind the headshot and a faint circular ring/glow.

The headline is split into visual phrases. The first phrase is bold white sans. The key word is muted gold. The final phrase is large serif italic white. Body text is short, two lines, and sits below with strong contrast. CTAs are rounded pills: primary wine red with arrow, secondary translucent phone pill with icon. A tiny mouse/scroll indicator appears near the bottom center of the hero.

Mobile keeps the same language: full-bleed background, stacked CTAs, and a circular portrait pushed lower in the viewport.

## Stats And Calculator Teaser

The stats area is a black band directly under the hero. The numbers are large serif numerals in white with gold plus signs. Labels are tiny uppercase gray. Columns are separated by very thin low-opacity vertical dividers. The band has generous vertical padding and feels like a premium proof strip.

Below stats, Joey does not show the full calculator. It shows a floating dark teaser card on the warm off-white background. The card has a small gold icon tile, title, short supporting text, and compact wine CTA. It creates a clean bridge between the stats and services sections.

## Services

Services are on a warm off-white section, not inside a heavy band. The heading reads like a sentence, mixing bold sans with serif italic gold. Cards are clean white blocks with large padding, tiny rounded icon tiles, strong service titles, body copy, and a full-width wine CTA. Cards use soft borders and shadows, with enough whitespace that the section breathes.

## About And Timeline

About switches abruptly into a black section. The portrait is large, cropped, and offset so it feels layered. A low-opacity outline frame sits behind it. Social icon buttons overlap the lower edge of the image.

The heading again mixes bold sans, gold emphasis, and serif italic. The timeline is the standout detail. It has a vertical gold line, circular ring markers, date labels in gold, and thin horizontal hairlines after the date. The line fades away at the bottom instead of ending abruptly. Timeline text is compact and left-aligned, with white titles and muted gray descriptions.

## Promo

Joey has a black promotional band for Club Privilege. It is centered, spacious, and cinematic. It uses a large centered logo/graphic, small decorative gold divider, sparse gold particles, one sentence with highlighted gold words, a gold square button, and small helper text. This section is not a generic card; it feels like a standalone feature.

## Testimonials

Testimonials are on a warm off-white section. A floating Google review badge overlaps the top. The heading is large, centered, and mixes sans with serif italic. The actual testimonial is not a card grid: it is one focused quote area with gold stars, huge faint quote marks, a large italic serif quote, a category eyebrow, and a row of interactive reviewer pills. The active pill is black with a gold avatar; inactive pills are pale circular chips. A Google reviews link sits below.

## Media

The media section starts with a large centered title. The featured media is a big rounded YouTube thumbnail with a soft shadow and a centered play button. Below it is an italic caption. The Instagram area has a label with Instagram icon, account handle, circular carousel controls, and a horizontal rail of post cards. Cards are image/video previews with play overlays and Instagram UI hints.

When real media is unavailable, clear `placehold.co` media placeholders should be used rather than hiding the section, because Joey's page uses media to carry a lot of polish and credibility.

## Final CTA And Footer

The final CTA is a full dark section with a giant centered mixed-type headline. Under it are two large dark cards with rounded borders: one scheduling card, one direct phone card. Each card has a small icon tile, title, short helper text, and a full-width action pill. The section has a subtle radial glow behind the cards.

The footer is black, compact, and visual. It includes the logo lockup, a short description, social circular buttons, a contact column with icons, a divider, copyright, and a small agency credit. It is not a dense legal/navigation footer on the homepage.

## First-Pass Missing Items In Melkior Site

- Header lacks a Multi-Prets logo lockup and polished transparent-to-solid transition.
- Hero uses a rectangular portrait instead of a circular medallion.
- Hero background texture is too subtle; it needs a clearer architectural placeholder image if no final asset exists.
- Hero heading lacks mixed typography and gold/serif emphasis.
- Hero lacks scroll indicator.
- Stats typography is too utilitarian and should use larger serif numerals plus thinner dividers.
- Missing a compact calculator teaser card after stats.
- Services lack icon tiles and editorial heading treatment.
- About image lacks layered frame/social overlay polish.
- Timeline needs date hairlines and a line that fades out at the end.
- Promo section is disabled; it should have a polished placeholder.
- Testimonials are disabled; use a polished placeholder testimonial/review area.
- Media is disabled; use clear placeholder thumbnails/cards.
- Final CTA/contact transition should feel more like a dark action area with large cards or visual weight.
