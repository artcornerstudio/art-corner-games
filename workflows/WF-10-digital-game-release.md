# WF-10 · Digital Release (The Way updates; future interactive tools)

Owner: Digital Experiences Pod (22) · Priority default: P3 (security fixes P1) · Status: READY FOR APPROVAL

**Trigger:** bug report, planned improvement, canon/naming audit finding, accessibility finding, or Offering-Architect-piloted new tool.

## Steps
1. **Change record** (`DIG-<id>`): issue/feature, user impact, canon/IP surface touched?, data surface touched?
2. **Spec & build:** change spec → implementation on a branch → self-review. Naming audit: zero "Forge" strings anywhere.
3. **Test pass:** functional; **canon fidelity** (five elements only, no invented-lore output paths); **accessibility** (keyboard, contrast, alt text, reduced motion); **youth/data** (no new collection, no dark patterns) — failures block the candidate.
4. **Release candidate:** build + release notes → QA certification → Librarian (canon) → Safety (data/youth) as applicable.
5. **Gate — Jean:** visual/IP changes need his artistic approval; **deploy to production = external publish gate** (until a scoped deploy policy exists for e.g. security patches).
6. **Deploy & verify:** post-deploy smoke check; rollback plan stated in the release notes before deploy, not improvised after.
7. **Closeout:** release logged; monitoring honestly scoped (only what's actually connected); Analytics records issue-to-release turnaround.

## Fail-safes
- Conflicting lore in a content file (e.g., "District 9") → not in canon → HOLD to Jean (tested, A5).
- Security issue → P1, fix-first; still no silent deploy — Jean gets an immediate ask, not a fait accompli.
- Third-party dependency with unclear license → blocked until license recorded.
