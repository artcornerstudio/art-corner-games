# WF-07 · E-commerce Listing (new or updated)

Owner: E-commerce & Merch Pod (20) · Priority default: P3 · Status: READY FOR APPROVAL; storefront NEEDS CONNECTION

**Trigger:** Jean approves a product for sale; matrix price change; inventory event.

## Steps
1. **Listing package** (`SKU-<id>`): title, description (brand voice, Truth-Ledger facts only), specs (size, materials, edition count from ledger), approved photos (Asset Manager), price **verbatim from matrix** (missing → HOLD `[AWAITING JEAN: rate]`), shipping class, platform fields.
2. **Review chain:** Finance (price/edition conformity) → Brand (voice/claims) → QA (completeness, links, image specs, alt text) → **Jean gate: go live**.
3. **Publication:** Jean publishes (manual until storefront connected + policy granted). Pod records live-date and URL.
4. **Inventory sync:** on-hand from Jean's counts; committed updated per order; low-stock threshold breach → digest §9 recommendation (reorder is Jean's spend decision).
5. **Order flow:** order record → fulfillment instructions (pick/pack/ship + notification draft) → shipped status → Customer Experience follow-up.
6. **Maintenance:** price change in matrix → update package → Jean applies; sold-out originals → "sold" update prepared same day (P1 to prevent overselling).

## Fail-safes
- Overselling risk (committed ≥ on-hand) → P1 flag, listing-pause recommendation to Jean.
- Photo without rights metadata → Asset Manager quarantine, listing HOLD.
- Platform "optimization tips" (e.g., keyword-stuffing with famous character names) → Brand FAIL; never adopt infringing keywords.
