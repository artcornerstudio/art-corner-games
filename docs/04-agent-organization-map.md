# ArtCorner Agent Organization — Map & Roster

23 agents + 1 human authority + 1 factory. Right-sized: every agent has a distinct accountability; no overlapping theatrical roles. Every agent file under `agents/` is a complete, portable operating prompt.

```
                        ┌─────────────────────────────┐
                        │   JEAN ESTHER (human)       │
                        │   Principal Artist &        │
                        │   Final Authority           │
                        │   ── Founder Control Center │
                        └─────────────┬───────────────┘
                                      │ approvals / direction
                        ┌─────────────┴───────────────┐
                        │  CHIEF OF STAFF /           │
                        │  ORCHESTRATOR (00)          │◄── all intake
                        └─────────────┬───────────────┘
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
   SHARED GOVERNANCE (7)     GROWTH & CUSTOMER OPS (5)   SERVICE PODS (9)
   01 Knowledge Librarian    10 Research & Lead Qual.    15 Murals & Public Art
      & Truth Steward        11 Customer Relations       16 Commissions & Originals
   02 Brand & Style Guardian 12 Proposals & Quotes       17 Instruction & Education
   03 QA & Certification     13 Customer Experience      18 Events & Exhibitions
   04 Safety, Rights &       14 Content & Communications 19 Publishing & Products
      Youth Review (veto)                                20 E-commerce & Merch
   05 Finance, Pricing &                                 21 Artist Development
      Capacity Review                                    22 Digital Experiences (The Way)
   06 Analytics & Performance                            23b Media Production
   07 Asset Manager
                                      ▼
                     EXPANSION: 23 Opportunity & Offering Architect
                     FACTORY:  New Agent Factory (process, not an agent)
                               └─ sample (INACTIVE): Grants & Public-Art
                                  Funding Specialist
```

## Roster

| ID | Agent | Layer | Accountability (one line) | File |
|---|---|---|---|---|
| — | Jean Esther | Founder | Signature art, canon, prices, contracts, publishing, final word | (human) |
| 00 | Chief of Staff / Orchestrator | Executive | Intake, routing, gates, digest, agent health | `agents/00-orchestrator-chief-of-staff.md` |
| 01 | Knowledge Librarian & Truth Steward | Governance | Single source of truth; canon fidelity; change control | `agents/governance/01-…` |
| 02 | Brand & Artistic-Style Guardian | Governance | Voice, visual identity, claims discipline | `agents/governance/02-…` |
| 03 | QA & Deliverable Certification | Governance | Completeness, correctness, production QA, root cause | `agents/governance/03-…` |
| 04 | Privacy, Consent, Rights & Youth-Safety Review | Governance | Youth rules, consent, rights, data minimalism — veto power | `agents/governance/04-…` |
| 05 | Finance, Pricing & Capacity Review | Governance | Matrix conformity, margins, Jean's hours | `agents/governance/05-…` |
| 06 | Analytics & Performance | Governance | Scorecard, founder-hours-saved, honest baselines | `agents/governance/06-…` |
| 07 | Asset Manager | Governance | Files, versions, rights metadata, retrieval | `agents/governance/07-…` |
| 10 | Research & Lead Qualification | Growth | Market/mural/partnership research; ethical lead scoring | `agents/growth/10-…` |
| 11 | Customer Relations | Growth | CRM records, inquiry response, intake, scheduling prep | `agents/growth/11-…` |
| 12 | Proposals & Quotes | Growth | Proposal/quote preparation from approved pricing only | `agents/growth/12-…` |
| 13 | Customer Experience | Growth | Follow-ups, rebooking, referrals, issue resolution | `agents/growth/13-…` |
| 14 | Content & Communications | Growth | Content calendar, social/email drafts, website copy | `agents/growth/14-…` |
| 15 | Murals & Public Art Pod | Delivery | S1 end-to-end from wall assessment to closeout | `agents/pods/15-…` |
| 16 | Commissions & Originals Pod | Delivery | S2 briefs, scope control, proofs, delivery | `agents/pods/16-…` |
| 17 | Instruction & Education Pod | Delivery | S3 lessons, classes, school programs, curricula | `agents/pods/17-…` |
| 18 | Events & Exhibitions Pod | Delivery | S4 parties, workshops, community events | `agents/pods/18-…` |
| 19 | Publishing & Products Pod | Delivery | S5 books, production files, launch assets | `agents/pods/19-…` |
| 20 | E-commerce & Merch Pod | Delivery | S6 listings, inventory logic, fulfillment coordination | `agents/pods/20-…` |
| 21 | Artist Development Pod | Delivery | S7 consulting support, showcases, partnerships | `agents/pods/21-…` |
| 22 | Digital Experiences Pod | Delivery | S8 The Way maintenance, web tools, accessibility | `agents/pods/22-…` |
| 23b | Media Production Pod | Delivery | S9 original age-appropriate media (safety-governed) | `agents/pods/23-media-production.md` |
| 23 | Opportunity & Offering Architect | Expansion | New-idea evaluation & staging; never auto-launches | `agents/expansion/23-…` |
| — | New Agent Factory | Expansion | 12-step process to certify future specialists | `factory/agent-factory.md` |

## Design rationale (right-sizing)
- **One accountable owner per service family** (acceptance gate) — the nine pods map 1:1 to catalog families S1–S9.
- **Cross-cutting concerns are shared, not duplicated:** research, CRM, quoting, follow-up, and content are org-wide utilities rather than nine copies inside pods.
- **Governance is a panel, not a bureaucracy:** reviewers attach per the routing table only where their concern applies; Safety has veto; nobody else stacks approvals beyond the matrix.
- **Deliberately not built:** separate "social media agent" vs "email agent" (one Content agent), "mural research" vs "market research" (one Research agent), a "legal agent" (contracts are Jean + human counsel; agents only flag).
