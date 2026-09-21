import { useEffect, useMemo, useRef, useState } from "react";
import { VARIANT_LABEL, formationById, formationsForVariant } from "../content";
import { compilePlay } from "../field/animation";
import { DesignerCanvas, type DesignerMode } from "../field/DesignerCanvas";
import { Diagram, useContainerWidth } from "../field/Diagram";
import { buildPlay, canRunRoute, checkLegality, deletePlay, loadPlaybook, savePlay, type SavedPlay } from "../games/designer";
import { LOOK_LABEL, resolvePlay, type DefenseLook, type Outcome } from "../games/outcome";
import { playSound } from "../sound";
import type { Assignment, Formation, FormationPlayer, Point, Variant } from "../types/play";

interface Props {
  onBack: () => void;
}

const VARIANTS: Variant[] = ["tackle11", "flag5"];
const TEST_LOOKS: DefenseLook[] = ["cover2", "cover3", "blitz"];
const KINDS: { kind: Assignment["kind"]; label: string }[] = [
  { kind: "route", label: "Run a route" },
  { kind: "carry", label: "Carry the ball" },
  { kind: "block", label: "Block" },
  { kind: "stay", label: "Stay" },
];

function newId() {
  return `custom-${Date.now().toString(36)}`;
}

/** Draw a play: place the O's, draw routes, pick who gets the ball, test it, save it. */
export function PlayDesigner({ onBack }: Props) {
  const [variant, setVariant] = useState<Variant>("tackle11");
  const { offense: offenseFormations, defense: defenseFormations } = useMemo(() => formationsForVariant(variant), [variant]);
  const [baseId, setBaseId] = useState(offenseFormations[0]?.id ?? "");
  const [players, setPlayers] = useState<FormationPlayer[]>(() => structuredClone(offenseFormations[0]?.players ?? []));
  const [defenseId, setDefenseId] = useState(defenseFormations[0]?.id ?? "");
  const [routes, setRoutes] = useState<Record<string, Point[]>>({});
  const [kinds, setKinds] = useState<Record<string, Assignment["kind"]>>({});
  const [target, setTarget] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<DesignerMode>("move");
  const [name, setName] = useState("My Play");
  const [playId, setPlayId] = useState(newId);
  const [test, setTest] = useState<{ play: ReturnType<typeof buildPlay>; offense: Formation; results: { look: DefenseLook; outcome: Outcome }[] } | null>(null);
  const [playbook, setPlaybook] = useState<SavedPlay[]>(() => loadPlaybook());
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const { ref, width } = useContainerWidth<HTMLDivElement>();
  const scrollRef = useRef<HTMLDivElement>(null);

  const defense = useMemo(() => formationById(defenseId || defenseFormations[0].id), [defenseId, defenseFormations]);
  const legality = useMemo(() => checkLegality(players, variant), [players, variant]);
  const eligible = useMemo(() => new Set(players.filter((p) => canRunRoute(p.id, players, variant)).map((p) => p.id)), [players, variant]);
  const selected = players.find((p) => p.id === selectedId) ?? null;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const h = requestAnimationFrame(() => {
      el.scrollLeft = Math.max(0, (el.scrollWidth - el.clientWidth) / 2);
    });
    return () => cancelAnimationFrame(h);
  }, [width, variant]);

  const reset = (v: Variant, formationId?: string) => {
    const list = formationsForVariant(v);
    const f = list.offense.find((x) => x.id === formationId) ?? list.offense[0];
    setVariant(v);
    setBaseId(f.id);
    setPlayers(structuredClone(f.players));
    setDefenseId(list.defense[0].id);
    setRoutes({});
    setKinds({});
    setTarget(null);
    setSelectedId(null);
    setTest(null);
    setPlayId(newId());
    setSavedNote(null);
  };

  const movePlayer = (id: string, to: Point) => {
    setPlayers((ps) => ps.map((p) => (p.id === id ? { ...p, x: to.x, y: to.y } : p)));
    setTest(null);
  };
  const addWaypoint = (id: string, p: Point) => {
    if (!eligible.has(id)) return;
    setRoutes((r) => ({ ...r, [id]: [...(r[id] ?? []), p] }));
    setKinds((k) => (k[id] ? k : { ...k, [id]: "route" }));
    playSound("tap");
    setTest(null);
  };
  const clearRoute = (id: string) => {
    setRoutes((r) => {
      const next = { ...r };
      delete next[id];
      return next;
    });
    setTest(null);
  };
  const setKind = (id: string, kind: Assignment["kind"]) => {
    setKinds((k) => ({ ...k, [id]: kind }));
    if (kind === "block" || kind === "stay") {
      if (target === id) setTarget(null);
    }
    setTest(null);
  };

  const offenseSnapshot = (): Formation => ({
    id: `${playId}-formation`,
    name: `${name} formation`,
    variant,
    side: "offense",
    description: `Your own alignment, started from ${formationById(baseId).name}.`,
    players: structuredClone(players),
  });

  const runTest = () => {
    if (!legality.ok) return;
    const offense = offenseSnapshot();
    const play = buildPlay({ id: playId, name: name.trim() || "My Play", variant, offense, defenseFormationId: defense.id, routes, kinds, target }, defense);
    const results = TEST_LOOKS.map((look) => ({ look, outcome: resolvePlay({ play, look, situation: { id: "t", variant, down: 1, distance: 10, yardLine: 40, options: [] } }) }));
    playSound("whistle");
    setTest({ play, offense, results });
  };

  const save = () => {
    if (!test) return;
    const book = savePlay({ play: test.play, offense: test.offense, savedAt: new Date().toISOString() });
    setPlaybook(book);
    setSavedNote(`Saved "${test.play.name}" to My Playbook. It is in the Play Lab too.`);
    playSound("badge");
  };

  const load = (entry: SavedPlay) => {
    setVariant(entry.play.variant);
    setBaseId(formationsForVariant(entry.play.variant).offense[0].id);
    setPlayers(structuredClone(entry.offense.players));
    setDefenseId(entry.play.defenseFormationId);
    const r: Record<string, Point[]> = {};
    const k: Record<string, Assignment["kind"]> = {};
    for (const a of entry.play.assignments) {
      if (!entry.offense.players.some((p) => p.id === a.playerId)) continue;
      if (a.kind === "route" || a.kind === "carry") {
        r[a.playerId] = a.path;
        k[a.playerId] = a.kind;
      } else if (a.kind === "block" || a.kind === "stay") k[a.playerId] = a.kind;
    }
    setRoutes(r);
    setKinds(k);
    const ev = entry.play.ball.events.find((e) => e.throw || e.t > 0);
    setTarget(ev?.to ?? null);
    setName(entry.play.name);
    setPlayId(entry.play.id);
    setSelectedId(null);
    setTest(null);
    setSavedNote(null);
    window.scrollTo({ top: 0 });
  };

  const compiledTest = useMemo(() => (test ? compilePlay(test.play, test.offense, defense) : null), [test, defense]);

  return (
    <main className="game designer">
      <div className="toolbar">
        <button type="button" className="btn btn-ghost" onClick={onBack}>← Home</button>
        <div className="segmented" role="group" aria-label="Game type">
          {VARIANTS.map((v) => (
            <button key={v} type="button" className={v === variant ? "seg seg-on" : "seg"} aria-pressed={v === variant} onClick={() => reset(v)}>
              {VARIANT_LABEL[v]}
            </button>
          ))}
        </div>
      </div>
      <h1>Play Designer</h1>

      <div className="designer-row">
        <label className="field-label">
          Start from
          <select value={baseId} onChange={(e) => reset(variant, e.target.value)}>
            {offenseFormations.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </label>
        <label className="field-label">
          Against
          <select value={defenseId} onChange={(e) => { setDefenseId(e.target.value); setTest(null); }}>
            {defenseFormations.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="segmented designer-mode" role="group" aria-label="Tool">
        <button type="button" className={mode === "move" ? "seg seg-on" : "seg"} aria-pressed={mode === "move"} onClick={() => setMode("move")}>Move players</button>
        <button type="button" className={mode === "route" ? "seg seg-on" : "seg"} aria-pressed={mode === "route"} onClick={() => setMode("route")}>Draw routes</button>
      </div>
      <p className="muted designer-help">
        {mode === "move" ? "Drag any O to a new spot. Tap one to pick it." : selected ? `Tap the grass to add points to ${selected.label ?? selected.position}'s route.` : "Tap a player first, then tap the grass where he should run."}
      </p>

      <div ref={ref} className="diagram">
        <div ref={scrollRef} className="stage-wrap" data-play="designer">
          <DesignerCanvas
            variant={variant}
            players={players}
            defense={defense}
            routes={routes}
            eligible={eligible}
            selectedId={selectedId}
            target={target}
            mode={mode}
            widthPx={width}
            onMovePlayer={movePlayer}
            onSelectPlayer={setSelectedId}
            onAddWaypoint={addWaypoint}
          />
        </div>
      </div>

      <section className={legality.ok ? "card legal legal-ok" : "card legal legal-bad"} aria-live="polite">
        {legality.ok ? (
          <p><strong>Legal formation.</strong> {legality.onLine.length} on the line, {players.length - legality.onLine.length} in the backfield.</p>
        ) : (
          <>
            <p><strong>Not legal yet:</strong></p>
            <ul>
              {legality.problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </>
        )}
      </section>

      {selected && (
        <section className="card selected-player">
          <h3>{selected.label ?? selected.position} <span className="muted">({selected.position})</span></h3>
          {!eligible.has(selected.id) && variant === "tackle11" && <p className="muted">Linemen in the middle of the line cannot catch passes. They block.</p>}
          <div className="choices choices-row">
            {KINDS.filter((k) => eligible.has(selected.id) || k.kind === "block" || k.kind === "stay").map((k) => (
              <button key={k.kind} type="button" className={(kinds[selected.id] ?? (eligible.has(selected.id) ? "route" : "block")) === k.kind ? "choice choice-right" : "choice"} onClick={() => setKind(selected.id, k.kind)}>
                {k.label}
              </button>
            ))}
          </div>
          <div className="controls">
            {eligible.has(selected.id) && selected.position !== "QB" && (
              <button type="button" className={target === selected.id ? "btn btn-primary" : "btn"} onClick={() => { setTarget(target === selected.id ? null : selected.id); setTest(null); }}>
                {target === selected.id ? "Gets the ball ✓" : "Give him the ball"}
              </button>
            )}
            {routes[selected.id]?.length ? (
              <button type="button" className="btn" onClick={() => clearRoute(selected.id)}>Clear route</button>
            ) : null}
          </div>
        </section>
      )}

      <section className="card">
        <label className="field-label">
          Play name
          <input className="text-input" value={name} maxLength={40} onChange={(e) => { setName(e.target.value); setTest(null); }} />
        </label>
        <div className="controls">
          <button type="button" className="btn btn-primary" disabled={!legality.ok} onClick={runTest}>Test it against 3 defenses</button>
          <button type="button" className="btn" onClick={() => reset(variant, baseId)}>Start over</button>
        </div>
        {!target && <p className="muted">Tip: pick a player and tap "Give him the ball" so the play has a target.</p>}
      </section>

      {test && compiledTest && (
        <section className="card test-results">
          <h2>{test.play.name}</h2>
          <p className="muted">{test.play.type === "run" ? "Run" : "Pass"} · {(test.play.tags ?? []).filter((t) => t !== "custom").join(", ")}</p>
          <Diagram compiled={compiledTest} controls infoCard={false} />
          <table className="results-table">
            <thead>
              <tr><th>Defense</th><th>Result</th></tr>
            </thead>
            <tbody>
              {test.results.map((r) => (
                <tr key={r.look}>
                  <td>{LOOK_LABEL[r.look]}</td>
                  <td>{r.outcome.touchdown ? "Touchdown!" : r.outcome.turnover ? "Turnover" : `${r.outcome.yards >= 0 ? "+" : ""}${r.outcome.yards} yards`} <span className="muted">{r.outcome.story}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="controls">
            <button type="button" className="btn btn-primary" onClick={save}>Save to My Playbook</button>
            <button type="button" className="btn" onClick={runTest}>Run it again</button>
          </div>
          {savedNote && <p className="badge-earned">{savedNote}</p>}
        </section>
      )}

      <section className="card">
        <h2>My Playbook</h2>
        {playbook.length === 0 ? (
          <p className="muted">No saved plays yet. Draw one, test it, and save it.</p>
        ) : (
          <ul className="playbook-list">
            {playbook.map((entry) => (
              <li key={entry.play.id}>
                <span>
                  <strong>{entry.play.name}</strong> <span className="muted">· {VARIANT_LABEL[entry.play.variant]} · {entry.play.type}</span>
                </span>
                <span className="controls">
                  <button type="button" className="btn btn-small" onClick={() => load(entry)}>Edit</button>
                  <button type="button" className="btn btn-small btn-ghost" onClick={() => setPlaybook(deletePlay(entry.play.id))}>Delete</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
