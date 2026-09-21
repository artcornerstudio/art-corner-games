import { useEffect, useMemo, useState } from "react";
import { VARIANT_LABEL, formationById, playsForVariant } from "../content";
import { compilePlay } from "../field/animation";
import { Diagram } from "../field/Diagram";
import { loadPlaybook } from "../games/designer";
import { CoachPanel } from "../coach/CoachPanel";
import { coachContextFor } from "../coach/context";
import { useTier } from "../progress";
import type { Formation, Play, Variant } from "../types/play";

interface Props {
  onBack: () => void;
}

const VARIANTS: Variant[] = ["tackle11", "flag5"];

export function PlayLab({ onBack }: Props) {
  const [variant, setVariant] = useState<Variant>("tackle11");
  const tier = useTier();
  const custom = useMemo(() => loadPlaybook().filter((s) => s.play.variant === variant), [variant]);
  const customOffense = useMemo(() => new Map(custom.map((s) => [s.play.id, s.offense] as [string, Formation])), [custom]);
  const available: Play[] = useMemo(() => [...playsForVariant(variant), ...custom.map((s) => s.play)], [variant, custom]);
  const [playId, setPlayId] = useState(available[0]?.id ?? "");
  useEffect(() => {
    if (!available.some((p) => p.id === playId)) setPlayId(available[0]?.id ?? "");
  }, [available, playId]);

  const play = available.find((p) => p.id === playId) ?? available[0];
  const compiled = useMemo(
    () => (play ? compilePlay(play, customOffense.get(play.id) ?? formationById(play.formationId), formationById(play.defenseFormationId)) : null),
    [play, customOffense],
  );

  return (
    <main className="playlab">
      <div className="toolbar">
        <button type="button" className="btn btn-ghost" onClick={onBack}>← Home</button>
        <div className="segmented" role="group" aria-label="Game type">
          {VARIANTS.map((v) => (
            <button key={v} type="button" className={v === variant ? "seg seg-on" : "seg"} aria-pressed={v === variant} onClick={() => setVariant(v)}>
              {VARIANT_LABEL[v]}
            </button>
          ))}
        </div>
      </div>

      {!play || !compiled ? (
        <p>No plays yet for {VARIANT_LABEL[variant]}.</p>
      ) : (
        <>
          <label className="field-label">
            Play
            <select value={play.id} onChange={(e) => setPlayId(e.target.value)}>
              {available.map((p) => (
                <option key={p.id} value={p.id}>
                  {customOffense.has(p.id) ? "★ " : ""}{p.name} · {p.type === "run" ? "Run" : "Pass"}
                </option>
              ))}
            </select>
          </label>

          <Diagram compiled={compiled} controls />

          <CoachPanel context={coachContextFor(compiled, tier)} questions={["what-happens", "why-it-works", "who-is-open", "what-beats-it"]} />

          <section className="card">
            <h2>{play.name}</h2>
            <p className="muted">
              {compiled.offense.name} vs {compiled.defense.name} · {play.type === "run" ? "Run" : "Pass"}
            </p>
            <h3>What happens</h3>
            <p>{play.description}</p>
            <h3>Why it works</h3>
            <p>{play.why}</p>
          </section>

          <section className="card">
            <h3>{compiled.offense.name}</h3>
            <p>{compiled.offense.description}</p>
            <h3>{compiled.defense.name}</h3>
            <p>{compiled.defense.description}</p>
          </section>
        </>
      )}
    </main>
  );
}
