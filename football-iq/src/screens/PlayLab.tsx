import { useEffect, useMemo, useRef, useState } from "react";
import { VARIANT_LABEL, formationById, playsForVariant, positions } from "../content";
import { compilePlay } from "../field/animation";
import { PlayViewer } from "../field/PlayViewer";
import { usePlayClock } from "../field/usePlayClock";
import type { FormationPlayer, Side, Variant } from "../types/play";

interface Props {
  onBack: () => void;
}

const VARIANTS: Variant[] = ["tackle11", "flag5"];

function useContainerWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(360);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(Math.floor(el.getBoundingClientRect().width));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

export function PlayLab({ onBack }: Props) {
  const [variant, setVariant] = useState<Variant>("tackle11");
  const available = useMemo(() => playsForVariant(variant), [variant]);
  const [playId, setPlayId] = useState(available[0]?.id ?? "");
  useEffect(() => {
    if (!available.some((p) => p.id === playId)) setPlayId(available[0]?.id ?? "");
  }, [available, playId]);

  const play = available.find((p) => p.id === playId) ?? available[0];
  const compiled = useMemo(
    () => (play ? compilePlay(play, formationById(play.formationId), formationById(play.defenseFormationId)) : null),
    [play],
  );
  const clock = usePlayClock(compiled?.duration ?? 1, play?.id ?? "");
  const { ref, width } = useContainerWidth<HTMLDivElement>();
  // On narrow screens the stage is wider than the container; start scrolled to the ball.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Wait one frame so the canvas has its final size before measuring scrollWidth.
    const handle = requestAnimationFrame(() => {
      el.scrollLeft = Math.max(0, (el.scrollWidth - el.clientWidth) / 2);
    });
    return () => cancelAnimationFrame(handle);
  }, [ref, width, variant]);
  const [selected, setSelected] = useState<{ player: FormationPlayer; side: Side } | null>(null);
  useEffect(() => setSelected(null), [play?.id]);

  if (!play || !compiled) {
    return (
      <main className="playlab">
        <button type="button" className="btn btn-ghost" onClick={onBack}>← Home</button>
        <p>No plays yet for {VARIANT_LABEL[variant]}.</p>
      </main>
    );
  }

  const info = selected ? positions[selected.player.position] : null;

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

      <label className="field-label">
        Play
        <select value={play.id} onChange={(e) => setPlayId(e.target.value)}>
          {available.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.type === "run" ? "Run" : "Pass"}
            </option>
          ))}
        </select>
      </label>

      <div ref={ref} className="stage-wrap">
        <PlayViewer
          compiled={compiled}
          time={clock.time}
          widthPx={width}
          selectedPlayerId={selected?.player.id ?? null}
          onSelectPlayer={(player, side) => setSelected({ player, side })}
        />
      </div>

      <div className="controls">
        {clock.playing ? (
          <button type="button" className="btn btn-primary" onClick={clock.pause}>Pause</button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={clock.play}>
            {clock.time >= clock.duration ? "Replay" : clock.time > 0 ? "Resume" : "Run the play"}
          </button>
        )}
        <button type="button" className="btn" onClick={clock.reset}>Reset</button>
        <input
          className="scrub"
          type="range"
          min={0}
          max={clock.duration}
          step={0.05}
          value={clock.time}
          onChange={(e) => clock.scrub(Number(e.target.value))}
          aria-label="Play timeline"
        />
      </div>

      <section className="card info" aria-live="polite">
        {info && selected ? (
          <>
            <h3>
              <span className={selected.side === "offense" ? "dot dot-o" : "dot dot-x"} aria-hidden="true" />
              {info.name} <span className="muted">({selected.player.label ?? selected.player.position})</span>
            </h3>
            <p>{info.job}</p>
          </>
        ) : (
          <p className="muted">Tap any player on the field to see who they are and what they do.</p>
        )}
      </section>

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
    </main>
  );
}
