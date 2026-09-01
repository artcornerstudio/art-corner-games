# ArtCorner Agent Organization

The operating system for ArtCorner — Jean Esther's art studio (Reading, PA area) — built as an extensible organization of specialized AI agents. Its purpose: remove Jean from repetitive coordination, research, drafting, tracking, follow-up, packaging, and routine decisions, while preserving him absolutely as principal artist, creative director, and final authority.

**Nothing in this system sends, publishes, prices, spends, or commits externally on its own.** Agents observe, draft, and prepare; Jean decides. That is a design guarantee, enforced by the Authority Matrix and verified adversarially.

## How to operate it

1. **Read the digest.** The Founder Control Center (`docs/06-founder-control-center.md`, mockup `founder-control-center.html`) is Jean's one daily touchpoint: ≤15 minutes, ≤5 ranked decisions.
2. **Run an agent.** Every file under `agents/` is a complete, portable system prompt. Open a Claude session (Claude Code, a Project, or Cowork), load the agent's file plus `docs/01` (truth) and `docs/05` (authority), and hand it the work item. The Orchestrator prompt (`agents/00`) is the entry point for routing anything.
3. **Follow the workflows.** `workflows/WF-01…13` are the end-to-end SOPs — trigger, intake checklists, decision gates, templates, closeout.
4. **Never bypass a gate.** The gates in `docs/05` §2 (art, canon, pricing, contracts, publishing, client photos, minor data, deletions, spending) belong to Jean alone.

## Repository map

| Path | Contents |
|---|---|
| `docs/00` | Phase-0 audit: capabilities, tool honesty, knowledge reconciliation |
| `docs/01` | **Institutional Truth Ledger** — the single source of truth |
| `docs/02` | Service catalog & pricing **rules** (matrix intentionally empty — awaiting Jean) |
| `docs/03` | Brand, Voice & Canon Guide |
| `docs/04` | Organization map & roster (23 agents) |
| `docs/05` | **Authority Matrix & routing rules** — the constitution |
| `docs/06` + `founder-control-center.html` | Founder Control Center spec + interface mockup |
| `docs/07` | Measurement scorecard (founder-hours headline; observed baselines only) |
| `docs/08` | Risk register & incident recovery |
| `agents/` | Orchestrator (00) · governance (01–07) · growth (10–14) · pods (15–23b) · expansion (23) |
| `workflows/` | 13 end-to-end service workflows |
| `templates/` | Communication templates CT-01…16 |
| `factory/` | New Agent Factory, rubric, spec template, and the INACTIVE sample specialist |
| `tests/` | Adversarial evaluation — 9 scenarios, 9/9 fail-safe |
| `task-ledger.md` | Build ledger across all phases |

## Component status (tool-honest)

- **LIVE:** this versioned workspace; all documents, prompts, workflows, templates; git-based truth versioning.
- **READY FOR APPROVAL:** operating the agents on real inquiries (recommended pilots below); scheduled daily digest compilation; CT-01 auto-acknowledgment policy.
- **NEEDS CONNECTION:** email, calendar, CRM, social publishing, storefront, Hostinger deploys — portable specs exist in each agent so they go live when connected.
- **DESIGN-ONLY:** an always-on autonomous multi-agent runtime. Today each agent runs when a session runs it; no background automation is claimed that doesn't exist.
- **BLOCKED (by policy):** automated spending; credential storage; any invented pricing/lore/figures.

## Recommended first live workflows (pilot)

1. **WF-01 Mural inquiry** — highest founder-time cost per inquiry; the intake checklist and CT-02 do real lifting immediately.
2. **WF-03 Class enrollment** — steady volume, low risk, exercises the youth-safety rails under observation.
3. **Daily digest** — start manually (one session each morning), and after two comfortable weeks decide on the scheduled Routine and the first Tier-4 grant (CT-01 acknowledgments).

## Decisions awaiting Jean (ranked)

1. **Populate the pricing matrix** (`docs/02` §3) — until then, every quote correctly holds.
2. **State weekly availability** — unlocks capacity checks and scheduling proposals.
3. **Approve the pilot** of WF-01 + WF-03 + manual daily digest.
4. **Choose the asset store** (Google Drive is connected) so the Asset Manager conventions attach to real folders.
5. **Approve CT-01** as the first EXECUTE-within-policy grant (after the two-week observation).

## Acceptance gates — verified

✔ Every service family (S1–S9) has one accountable agent · ✔ Safety/rights checks active in every workflow touching youth, photos, or IP (Safety holds veto) · ✔ Orchestrator routes per a complete routing table, tested against 9 adversarial scenarios (9/9 fail-safe) · ✔ Founder Control Center specified + usable mockup · ✔ No unsupported claims: pricing/sales/margins/customer lists remain UNKNOWN placeholders; Meta Sabian canon limited to its five established elements; the app is "The Way" everywhere.
