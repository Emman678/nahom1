# Asset map

Supplied with the request:

| File | Type | Size | Use |
| --- | --- | --- | --- |
| `Nahom_Video_Editor_Portfolio_Blueprint_1.pdf` | PDF, 11 pages | n/a | Source of truth for order, copy, design system, behaviour, QA. Not shipped. |
| `photo_2026-10-09_15-32-06.jpg` | JPEG, 853×1280 (2:3) | 130 KB | Portrait of Nahom. Hero frame (colour, softened) and About section (black and white crop). Original preserved as `assets/images/nahom-portrait-original.jpg`. |
| `assets/videos/Podcast_AI_UGC.mp4` | MP4 video | n/a | AI UGC Ads project card. |
| `assets/videos/Podcast-Style UGC Ad.mp4` | MP4 video | n/a | AI UGC Ads project card. |
| `assets/videos/AI UGC.mp4` | MP4 video | n/a | AI UGC Ads project card. |

Derived (created for the site):

| File | Purpose |
| --- | --- |
| `assets/images/nahom-portrait-853.webp` / `.jpg` | Main web copies (hero + About) |
| `assets/images/nahom-portrait-480.webp` / `.jpg` | Small-screen copies via `srcset` |
| `assets/images/og-share.jpg` (1200×630) | Social share image, built from the portrait + headline |
| `assets/icons/favicon.svg` | Lime "N" favicon (placeholder until a logo is supplied) |
| `css/fonts.css`, `assets/fonts/*` | Embedded fonts + sources + licences |

Not supplied (so nothing is shown for them): thumbnails, logo, confirmed contact/social links, client names, metrics, testimonials, showreel.

Mapping of homepage sections to media: Hero → portrait (optional loop via `hero.videoUrl`) · About → portrait crop · Work → three AI UGC Ads video cards plus neutral designed thumbnails for remaining entries · Showreel → none yet ("coming soon" state) · Toolkit → text labels only (no logos supplied).

Note: the portrait already contains software app icons and the words "VIDEO EDITOR". It is used as supplied. The Toolkit section deliberately uses text labels instead of icons, per the blueprint.
