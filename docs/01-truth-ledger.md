# ArtCorner Institutional Truth Ledger

**The single source of truth for every ArtCorner agent.** Version-controlled in git; every change is a commit. Agents READ this ledger; only the Knowledge Librarian & Truth Steward may PREPARE edits, and edits to VERIFIED facts, canon, or policy require **Jean's approval** before merge.

Confidence tiers: **VERIFIED** (explicitly supported) → **ESTABLISHED** (consistently supported) → **PROPOSED** (discussed, not confirmed active) → **UNKNOWN** (must never be invented).

---

## 1. VERIFIED

### Founder & identity
- Founder: **Jean Esther** (male; pronouns he/him). Principal creative leader, illustrator, instructor, and founder. Sole authority for signature artistic direction, IP canon, and major commitments.
- Location: **Reading, Pennsylvania area**. Purchased the **Antietam, PA studio in 2018**, after instructing **10+ years at Studio B in Boyertown**.
- Education includes **B.O.C.E.S. Cultural Arts Center** (Long Island, NY).

### Web presence
- **artcorner.net** — migrated from WordPress to **Hostinger in August 2026**.

### Core services (active)
- Custom murals (e.g., **Reading Area Water Authority** projects)
- Fine art and originals
- Portrait drawing
- Logo design
- Consulting
- Art teaching / instruction
- Caricature illustration at events

### Technical & artistic expertise
- Digital painting; character animation; 2D fighting-game sprite sheets
- 3D modeling (**Blender on macOS**)
- Microcement wall application
- Vehicle pinstriping (oil-based enamel)
- Foam sculpting (e.g., **"Tom's Taxi"** for the CELG Municipal Officials Dinner)
- Gallery projection mapping

### Intellectual property & publications
- Author/illustrator of the independent graphic novel series **Meta Sabian** (original superhero character designs).
- Author of **ARTCORNER PRESENTS: How to Be a Successful Artist** (methods for building craft, confidence, visibility, and income).
- Developer of the Meta Sabian character design web application, **"The Way"** (see naming override below).

## 2. NAMING OVERRIDE (strict, permanent)

| Retired names | Official name | Effective |
|---|---|---|
| "Character Forge", "Forge", "Forged" | **"The Way"** | 2026-08-30 |

Rule: no agent may use the retired names in any output. If a customer or old document uses a retired name, agents recognize it, map it to "The Way," and (in external replies) gently use the current name without lecturing the customer.

## 3. ESTABLISHED

### Brand voice
Welcoming, encouraging, artistically credible, community-minded, practical, professionally presented. (Full guide: `docs/03-brand-voice-canon-guide.md`.)

### Target audiences
Children, pre-teens, teenagers, adults, seniors, families, emerging/established artists, schools, youth programs, community organizations, businesses, realtors, developers, municipalities, public-art partners, collectors, event clients.

### Customer pathways
1. **Create and Learn**
2. **Build an Artist Life**
3. **Transform a Place**

### Core beliefs
> "Talent deserves support. Beauty deserves structure."

### Customer jobs
**Read · Explore · Create · Play · Give**

### Meta Sabian canon (preserve exactly; NEVER extend or invent)
Canonical elements on record: **"Akin Connection Within"**, **"Akin"**, **"District 7"**, **"Thane"**, **"Saku"**.
Rule: agents may reference these elements verbatim. Any question about lore not on this list is answered "not established in canon" and routed to Jean. No agent invents lore, relationships between elements, backstory, or spelling variants.

### Youth content rules (absolute)
All youth-facing content must be original, age-appropriate, safe, and inclusive. Strictly prohibited: copyrighted characters without permission; sexualized imagery; graphic violence; drugs/alcohol; hate symbols; harmful stereotypes; dangerous challenges; demeaning language; inappropriate data collection from or about minors.

## 4. PROPOSED (not active — do not present as offerings)

- **ArtCorner Arcade** and other interactive games.
- Educational/entertainment video possibilities, including AI-assisted children's content — pending strict rights and safety verification.
- Future hometown-themed books and products.

Rule: PROPOSED items may be researched and piloted through the Opportunity & Offering Architect only. They never appear in customer-facing materials, quotes, or the live service menu without Jean's approval.

## 5. UNKNOWN (never invent; always ask or mark "TBD — awaiting Jean")

- Current pricing matrices and rate cards
- Sales volume, revenue, and profit margins
- Specific customer lists beyond established public projects (e.g., Reading Area Water Authority, CELG dinner)
- Unlisted partner credentials or private agreements

Rule: any output requiring an UNKNOWN gets a clearly marked placeholder (`[AWAITING JEAN: rate]`) and is queued at the PREPARE tier — never sent with invented values, and never sent with placeholders still inside.

## 6. Change control

1. Anyone (agent or Jean) may propose a ledger change with evidence.
2. The Knowledge Librarian drafts the edit as a git commit on a branch with the evidence cited in the commit message.
3. Edits to VERIFIED facts, canon, policy, or artistic identity → **Jean approval gate** before merge. Additions of new ESTABLISHED/PROPOSED items with clear evidence → Librarian may merge and report in the daily digest.
4. If Jean edits an *output*, the feedback is logged (`/feedback` convention in the ops log) — the ledger itself is **not** silently rewritten from output edits. A ledger change requires an explicit, evidenced proposal.
5. Git history is the audit trail. No force-pushes to the ledger.
