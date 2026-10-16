# Website & Web-Presence Audit — 2026-10-16

Prepared by: Content & Communications (14) with Digital Experiences (22). Status: **READY FOR JEAN** — nothing on any site was changed.
Method: Hostinger connector (read-only: website list, DNS, file listings, Hostinger's public-site scanner). Limitation: this environment cannot load public web pages directly, and builder-site page text is not file-readable, so page *copy* (wording, old "Forge" naming, class details) was **not** reviewed. That needs a copy/paste or a screenshot from Jean.

## 1. What actually exists (verified via Hostinger)

| Address | What it is | State |
|---|---|---|
| artcornerstudio.net | Main site (Hostinger Website Builder), 13 pages in sitemap, last updated 2026-10-01 | Live, HTTPS, scanner grade C (63/100) |
| theway.artcornerstudio.net | Intended home of The Way | **Only Hostinger's default placeholder page (`default.php`)** — The Way is not deployed here |
| play.artcornerstudio.net | Unity web game **"Meta Sabian Runners" v0.5.0**, "An ArtCorner game" | Live; credit link points to `https://artcorner.net` |
| artcornerstudio.cloud | Node.js site | Live (contents not reviewed) |
| artcorner.net | Not in this Hostinger account; DNS managed elsewhere | Unknown — verify it still resolves, since the game links to it |

Mail: artcornerstudio.net has **Hostinger Mail** configured (MX, SPF, DKIM). A mailbox such as `jean@artcornerstudio.net` can exist on the existing plan.

## 2. Ranked fixes (each is a Jean gate: external publish)

1. **Add a way to contact ArtCorner** — scanner found no contact page link, no `mailto:`/`tel:` on the homepage. Fix: a "Contact / Book" button in the header linking to a contact page with email (and phone if Jean wants it public), plus a short inquiry form whose fields mirror our intake checklists (service type, dates, location; for murals: wall size, surface, photos). *Highest impact: this is where inquiries start.*
2. **Fix theway.artcornerstudio.net** — either deploy The Way there or redirect it to wherever The Way currently lives. A placeholder page on the app's official name undercuts it.
3. **Confirm artcorner.net** — the game's credit link targets it. If artcorner.net no longer resolves, change the link to artcornerstudio.net.
4. **Add LocalBusiness details** — no Organization/LocalBusiness data, so search engines and maps can't tie the site to a Reading-area studio. Fix: business name, area served (Reading/Berks County), contact, and links to social profiles.
5. **One main heading per page** — homepage has 5 `<h1>` headings; demote 4 to `<h2>` (Builder: change the text style). Minor SEO/readability.
6. **Terms page** — scanner found none linked. Recommend a simple policies page (deposits, cancellations, photo policy) — content is Jean's call and depends on the pricing matrix.
7. **Prices** — scanner flags no prices. **Intentionally not addressed**: pricing is UNKNOWN until Jean populates `docs/02` §3. Do not add prices from anywhere else.

Skipped as low value for a studio this size: Markdown negotiation, WebMCP tools, MCP server card, page-weight trimming (Builder-controlled).

## 3. Truth Ledger change proposals (Jean approval required; ledger NOT edited)

| # | Ledger currently says | Evidence found | Proposed |
|---|---|---|---|
| L1 | Web presence: **artcorner.net** migrated to Hostinger, Aug 2026 | Hostinger account hosts **artcornerstudio.net** (+ theway., play., .cloud); artcorner.net is not in it | Jean confirms which domain is primary; ledger updated to match |
| L2 | ArtCorner Arcade / interactive games: **PROPOSED** | "Meta Sabian Runners" v0.5.0 is live at play.artcornerstudio.net | Jean confirms it's an active offering → move to VERIFIED/ESTABLISHED; Media/Digital pods take it on (canon & youth-safety review of the game is then due) |
| L3 | The Way: developed app | Its subdomain shows a placeholder | Record The Way's actual live URL |
