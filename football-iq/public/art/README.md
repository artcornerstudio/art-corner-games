# Art

Drop the generated art here. The app falls back to a star icon for any file that is missing.

| File | What |
| --- | --- |
| `stadium-bg.webp`, `stadium-bg-small.webp` | Home screen stadium photo (2400 and 1200 px wide) |
| `mascot-hero.png` | Home screen mascot on his holographic field, 640 px |
| `mascot.png` | Square crop of the same mascot for small spots (coach panel, landing page), 320 px |
| `unit-<unitId>.png` | Icon on each unit card (rules, offense, defense, reads, offense2, special, flag7, positions, coach), 256 px |
| `badge-rules.png` | Rules Rookie badge, 256 px square |
| `badge-offense.png` | Offense Starter |
| `badge-defense.png` | Defense Starter |
| `badge-reads.png` | Coverage Reader |
| `badge-offense2.png` | Play Caller |
| `badge-special.png` | Special Teams Captain |
| `badge-flag7.png` | Flag Captain |

The originals were generated with OpenArt (Nano Banana 2 Lite, 1024 px) and live in the
Art Corner OpenArt library. Downscale with `node scripts/shrink-art.mjs <rawDir> public/art 256`
(and 360 for the mascot).

The stadium, mascot and unit icons were made in October 2026 with OpenArt (Nano Banana 2.1, image to image
from the home screen mock-up). The mascot and icons were rendered on a flat magenta backdrop and cut out with
`scripts/key-art.cjs`; the icons come from one 3x3 sheet, in unit order.
