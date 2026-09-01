# Risk Register & Incident Recovery Procedures

Owner: Orchestrator (register upkeep) with Safety Review (P0 authority). Reviewed monthly; every incident adds or updates an entry.

## Risk register

| ID | Risk | Likelihood | Impact | Mitigation (built-in) | Residual action |
|---|---|---|---|---|---|
| R-01 | Youth-safety failure (content, contact, or data) | Low | Severe | Safety veto; mandatory checklists (WF-03/04/05); minimal-data rule; no override path | Zero-tolerance; any near-miss → procedure IR-1 |
| R-02 | Invented facts/prices reaching a customer | Medium (LLM nature) | High | UNKNOWN fences; placeholder discipline; Finance conformity; QA certification; Brand claims check — 4 independent layers | Live-pilot observation before any Tier-4 grants |
| R-03 | Canon corruption (invented Meta Sabian lore, "Forge" resurfacing) | Medium | High | Librarian canon check; five-element allowlist; drift audits; git history | Quarterly canon audit of app + published content |
| R-04 | Unauthorized external action (send/publish/spend) | Low | High | Tier system; empty §4 grants at launch; PREPARE/sent queue separation; anti-escalation rule (tested A8) | Jean grants Tier-4 policies narrowly, one at a time |
| R-05 | Prompt injection via inquiries/web content | Medium | Medium–High | Treat-as-content rule (tested A7); confidential customer ledger; escalation duty | Periodic injection re-tests when prompts change |
| R-06 | Single-founder dependency (Jean unavailable) | Medium | High | System degrades gracefully: everything queues at PREPARE; nothing breaks, work waits | Jean may name a human delegate for specific gates (his decision) |
| R-07 | Connector outage / silent automation failure | Medium | Medium | Honesty rule: failures reported verbatim in digest §8; no success claims without records (tested A6) | Manual-fallback instructions in every send handoff |
| R-08 | Data loss (repo, customer ledger, assets) | Low | High | Git + GitHub remote; Asset Manager versioning; deletions Jean-gated | Jean should enable an independent backup of Drive/assets |
| R-09 | Consent/rights breach (photos, client work, licenses) | Low | High | Consent metadata on assets; quarantine rule; client-photo Jean gate | Annual consent-record audit |
| R-10 | Founder overload via the system itself (digest bloat) | Medium | Medium | ≤15-min budget; ≤5 decisions; overflow ranking; digest-health metric | QA tracks digest overruns as defects |
| R-11 | Reputation damage from off-brand output | Low | Medium | Brand review on all external items; Jean publish gates | — |
| R-12 | Scope creep of the agent org (theatrical agents, process for its own sake) | Medium | Medium | Factory step 2 (amendment-first); rubric R1; retirement path R9 | Day-30 probation reviews; annual roster prune |

## Incident recovery procedures

### IR-1 · Safety / rights / minor-data incident (P0)
1. **Freeze:** Orchestrator halts all related items and outputs immediately.
2. **Notify:** Jean immediately (bypass digest) + Safety Review leads the response.
3. **Contain:** identify what was exposed/published/collected; prepare retraction/deletion requests for Jean's execution (deletions are his gate, executed fast here).
4. **Record:** timeline verbatim; no minimizing language.
5. **Remediate:** root cause (QA) → control fix → re-test the failed control adversarially before unfreezing the lane.
6. **Review:** Jean decides any external communication (with counsel where legal exposure exists — agents flag, humans decide).

### IR-2 · False/invented content discovered in an external artifact
1. Verify against Truth Ledger; classify (price, fact, lore, claim).
2. Prepare correction package (fixed artifact + correction note) → expedited Brand/QA → Jean gate to publish the correction.
3. Trace how it passed 4 layers; fix the layer, add a drift-audit pattern; log in register (R-02/R-03).

### IR-3 · Unauthorized external action by an agent
1. Freeze the agent (its prompt is pulled from rotation by the Orchestrator).
2. Document what was sent/published/committed; prepare reversal/apology package for Jean.
3. Full factory re-certification (WF-13 steps 7–10) required before the agent returns; the gap that allowed it becomes a new adversarial test for every agent.

### IR-4 · Data loss / corruption
1. Stop writes to the affected store.
2. Restore from git history / version store (Asset Manager's no-overwrite rule makes this possible).
3. Diff restored vs. lost; report the gap honestly; register update (R-08).

### IR-5 · Connector/integration failure
1. Log verbatim error in digest §8; mark affected queue items NOT SENT/NOT SYNCED.
2. Prepare manual-fallback instructions for Jean per item.
3. On restoration, reconcile queues against records before resuming — no double-sends.

## Standing rule
Incidents are learning inputs: every IR closure produces at least one new synthetic test added to `tests/` so the same failure cannot pass silently twice.
