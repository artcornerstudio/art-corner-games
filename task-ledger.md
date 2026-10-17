# ArtCorner Agent Organization — Build Task Ledger

Maintained across all build phases. Status values: DONE, IN PROGRESS, PENDING, BLOCKED, AWAITING JEAN.

| # | Phase | Task | Status | Notes |
|---|-------|------|--------|-------|
| 0.1 | 0 | Repository discovery (read-only) | DONE | Repo empty except stub README; branch `claude/artcorner-ai-agents-b1pzx8` |
| 0.2 | 0 | Environment capability audit (tool honesty) | DONE | See `docs/00-phase0-audit-report.md` |
| 0.3 | 0 | Knowledge Capsule reconciliation | DONE | One naming override ("The Way"), unknowns fenced; see audit report |
| 1.1 | 1 | Institutional Truth Ledger | DONE | `docs/01-truth-ledger.md` |
| 1.2 | 1 | Service/Product Catalog & Pricing Rules | DONE | `docs/02-service-catalog-pricing-rules.md` |
| 1.3 | 1 | Brand, Voice & Canon Guide | DONE | `docs/03-brand-voice-canon-guide.md` |
| 1.4 | 1 | Operating model & authority matrix | DONE | `docs/05-authority-matrix-routing-rules.md` |
| 2.1 | 2 | Chief of Staff / Orchestrator prompt | DONE | `agents/00-orchestrator-chief-of-staff.md` |
| 2.2 | 2 | Governance agent prompts (7) | DONE | `agents/governance/` |
| 2.3 | 2 | Founder Control Center design + mockup | DONE | `docs/06-founder-control-center.md`, `founder-control-center.html` |
| 2.4 | 2 | Agent Organization Map & Roster | DONE | `docs/04-agent-organization-map.md` |
| 3.1 | 3 | Growth & customer operations agent prompts (5) | DONE | `agents/growth/` |
| 3.2 | 3 | Service delivery pod prompts (9) | DONE | `agents/pods/` |
| 3.3 | 3 | Service workflows & SOPs (13) | DONE | `workflows/` |
| 3.4 | 3 | Communication templates | DONE | `templates/communication-templates.md` |
| 4.1 | 4 | Opportunity & Offering Architect | DONE | `agents/expansion/23-opportunity-offering-architect.md` |
| 4.2 | 4 | New Agent Factory + evaluation rubric | DONE | `factory/agent-factory.md` |
| 4.3 | 4 | Sample inactive specialist (factory demo) | DONE | `factory/samples/grants-public-art-funding-specialist.md` — INACTIVE |
| 5.1 | 5 | Adversarial test scenarios + results | DONE | `tests/adversarial-evaluation.md` — 9/9 fail-safe |
| 5.2 | 5 | Measurement scorecard | DONE | `docs/07-measurement-scorecard.md` |
| 5.3 | 5 | Risk register & incident recovery | DONE | `docs/08-risk-register-incident-recovery.md` |
| 6.1 | 6 | README & Operating Guide | DONE | `README.md` |
| 6.2 | 6 | Live/draft status labeling of all components | DONE | Audit report §4 + README |
| 6.3 | 6 | Pilot recommendations + decisions for Jean | DONE | README §"First live workflows" + decision digest |
| 6.4 | 6 | Commit and push build package | DONE | Pushed to `claude/artcorner-ai-agents-b1pzx8` |
| 7.1 | Ops | Gmail connected and verified | DONE | 2026-10-16; audit `docs/00` updated |
| 7.2 | Ops | First inbox triage (artcorner101@gmail.com) | DONE | 0 open customer inquiries in past year; 8 threads labeled (4 security, 2 decisions, 2 relationships); 0 drafts; nothing sent |
| 7.3 | Ops | Locate the real business inbox | DONE | Business email is jeanesther@artcornerstudio.net (Hostinger Mail, 1 seat). Forwarder to artcorner101@gmail.com created 2026-10-16 (keeps copy) — confirmed and verified end-to-end 2026-10-17 (test inquiry arrived in Hostinger, forwarded to Gmail, labeled ArtCorner/Business Inbox) |
| 7.4 | Ops | Website audit (Hostinger, read-only) | DONE | `docs/09-website-audit-2026-10-16.md`; page copy not reviewable from this environment |
| 7.5 | Ops | 10th & Green reconnection email | DONE (draft) | Gmail draft for Jean; NOT sent (external-send gate) |
| 7.6 | Ops | Truth Ledger corrections L1–L3 (domain, live game, The Way URL) | AWAITING JEAN | Proposed in `docs/09` §3; ledger untouched |
| 7.9 | Ops | Disconnect jeanesther@ from agents | DONE | Forwarder deleted 2026-10-17 at Jean's request; jeanesther@ is Jean's private mailbox. Mail already forwarded stays in Gmail |
| 7.8 | Ops | Customer inbox hello@artcornerstudio.net | IN PROGRESS | Created by Jean 2026-10-17 (2nd seat). Forwarder to Gmail created, awaiting Jean's confirmation click; contact page draft now uses hello@ |
| 7.7 | Ops | Contact / Book page draft | DONE (draft) | `website/contact-page-draft.md` + preview; awaiting Jean to build in Website Builder (external-publish gate) |

## Items awaiting Jean (not blockers to the build)
- Approve pricing matrix inputs (UNKNOWN — never fabricated; catalog ships with placeholder rules requiring his numbers).
- Approve first live workflows for pilot (recommendations in README).
- Connect external systems (email, calendar, CRM, storefront) before any EXECUTE-tier automation.
