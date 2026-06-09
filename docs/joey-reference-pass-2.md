# Joey Emond Reference Audit - Pass 2

Reference URL: https://www.joeyemond.ca/

This second pass was performed after the first Melkior implementation pass. The goal was to look at the Joey reference again from a fresh visual perspective, section by section, then translate missing polish into the Melkior site without copying Joey's assets or copy.

## Header

Joey's header starts transparent over the hero, then becomes a clean white bar after scroll. The desktop lockup combines the personal logo and Multi-Prets mark with a thin divider. Links are compact, uppercase, and evenly spaced. The CTA is a pill with a softer, glassy feel on dark and a solid wine color on light.

Implementation notes:

- Melkior now uses the same personal-logo plus partner-mark structure.
- The partner mark uses a clear placeholder chip until a final Multi-Prets logo asset is available.
- The legal templates now share the same header structure and link order as the homepage.

## Hero

Joey's hero is a full viewport scene. It uses a dark architecture photo, not a flat gradient. The copy sits left, the portrait sits right inside a circular red medallion, and the text has three visual layers: bold white sans, a muted gold keyword, then a large italic serif phrase. The primary CTA has a directional arrow. The phone CTA has a phone icon and feels quieter than the primary. A small mouse indicator sits near the bottom center.

Implementation notes:

- Melkior now uses a 100vh hero with a background image placeholder and a subtle diagonal texture overlay.
- The headline uses markdown-driven emphasis for the gold keyword and italic serif phrase.
- The portrait is circular with a faint ring/glow treatment.
- The primary CTA includes an arrow; the phone CTA includes the MDI phone-in-talk outline path.
- The scroll cue is present and animated.

## Stats And Calculator Teaser

Joey's stats are a black proof strip with large serif numerals, narrow vertical separators, uppercase gray labels, and generous vertical padding. The calculator is not shown immediately as a full form; instead, a dark floating teaser card bridges the stats to the services.

Implementation notes:

- Melkior's stats band is full-width, centered, and more spacious.
- A dark calculator teaser card now appears after the stats and links to the full calculator lower on the page.
- The full calculator remains near the bottom, above contact, per the latest layout direction.

## Services

Joey's services are calm and editorial: a centered mixed-type heading, white cards, icon tiles, short descriptions, and a primary action per card. The cards have soft shadows, large padding, and a clean rhythm.

Implementation notes:

- Melkior keeps the dark wine services background requested earlier, but the cards now use icon tiles, stronger spacing, and hover depth.
- Repeated card CTAs remain removed; the shared services CTA is handled as a single action block instead of repetitive links.

## Guide

Joey's guide section is simple but text-rich enough to avoid feeling sparse. Cards are grouped on the right while the left column explains what the visitor should understand before acting.

Implementation notes:

- Melkior already expanded the guide intro and keeps three practical cards.
- The section remains light and restrained so it acts as a transition between services and story.

## About And Timeline

Joey's about section is black, cinematic, and layered. The portrait is large with an offset outline frame and social buttons overlapping the bottom. The timeline has a vertical gold line, ring markers, date labels, hairlines after dates, and the line fades out at the bottom.

Implementation notes:

- Melkior now has the layered image frame and profile overlay.
- The timeline uses a single vertical line with a fade-out, circular markers, gold dates, and date hairlines.
- The current-year replacement still happens dynamically when JavaScript is available.

## Promo Reference

Joey's Club Privilege area is a standalone black feature, not a generic card. It uses a centered promo graphic, a small gold divider, sparse glow/particle energy, a concise message, and a gold action.

Implementation notes:

- Melkior does not currently render this section because there is no confirmed equivalent offer.
- The dark and gold atmosphere was moved into the testimonial carousel instead.
- If an official offer exists later, add it back as a real content section rather than a placeholder.

## Testimonials

Joey's testimonial section is focused rather than grid-heavy. It uses a Google review badge, a large quote treatment, gold stars, and reviewer chips. The key feeling is trust and emphasis, not many cards.

Implementation notes:

- Melkior now renders a Google-style badge and a focused testimonial showcase.
- The content is deliberately placeholder-only and does not fabricate reviews.
- Real approved testimonials can replace the placeholder entries through content settings/admin.

## Media

Joey's media section has a large YouTube-style feature thumbnail, a centered play control, italic caption, Instagram heading, carousel controls, and a horizontal rail of media cards.

Implementation notes:

- Melkior now has a featured media placeholder, play button, caption, account label, controls, and horizontal media rail.
- All missing media images use clear placehold.co placeholders.

## Final CTA And Contact

Joey's final action area is dark, spacious, and card-based. It has a large centered headline and two clear paths: schedule/contact and call. It does not feel like a small banner. The contact area then follows with form and practical details.

Implementation notes:

- Melkior now has a dark contact-action area above the form with two action cards.
- The form remains inline-validated and the phone field remains required.
- The phone CTA opens the dialer on mobile and shows the phone modal on desktop.

## Remaining Intentional Differences

- Joey's site uses real broker photography, real city photography, real embedded media, and real social content. Melkior uses placeholders where final assets are unavailable.
- Joey's service section is light; Melkior's is dark wine because the previous design feedback explicitly requested that background.
- Joey's footer is more brand/social oriented; Melkior keeps the requested three-column footer structure with description, navigation, administration, and language.
