# WF-13 · New Agent Certification

Owner: New Agent Factory process (`factory/agent-factory.md`) · Priority default: P4 · Status: READY FOR APPROVAL

**Trigger:** capability gap flagged by the Orchestrator (AGENT-ADMIN item), a pod, or Jean.

## Steps (the factory's 12 steps as an operated workflow)
1. **Define need** (`AGT-<id>`): the recurring work, volume evidence, who suffers today.
2. **Check existing agents:** could a current agent absorb it with a scope amendment? Prefer amendment over new agent — right-sizing rule.
3. **Justification memo:** why new > amend; expected founder-hours saved (estimated from observed volume, labeled as estimate).
4. **Spec & risks:** mission, authority ceiling, interfaces, data touched, failure modes, gates it must respect.
5. **Operating prompt:** drafted on `factory/templates/agent-spec-template.md`.
6. **Workflows:** its SOPs and how it plugs into routing table + review chains.
7. **Synthetic tests:** happy path, missing-data, gate-violation temptation, prompt-injection attempt, out-of-scope request — with expected fail-safe behavior defined *before* testing.
8. **Sandbox run:** execute tests on synthetic data only; record verbatim results (QA operates the tests).
9. **Governance review:** Librarian (truth interfaces), Brand (voice surfaces), Safety (data/youth/rights surfaces), Finance (cost/capacity surfaces), QA (test adequacy). Each verdict recorded.
10. **Gate — Jean: activate?** Digest decision with the one-page cert summary.
11. **Register & version:** roster entry (`docs/04`), routing-table update, prompt versioned v1.0.
12. **Monitor:** 30-day probation — Analytics tracks its rejection rate and HOLD frequency; Orchestrator reviews at day 30 (keep / amend / retire recommendation to Jean).

## Fail-safes
- Any failed synthetic test → fix and re-run; no "known-issue" activations.
- Duplicate-scope detection at step 2 → merge into existing agent, close AGT item.
- Demonstration instance: `factory/samples/grants-public-art-funding-specialist.md` (built through steps 1–9, INACTIVE, awaiting a real need + Jean).
