import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_OPPONENT, formationById, playById, positions } from "../content";
import type { DiagramRef, FormationPlayer, Side } from "../types/play";
import { compileFormations, compilePlay, type CompiledPlay } from "./animation";
import { PlayViewer } from "./PlayViewer";
import { usePlayClock } from "./usePlayClock";

export function useContainerWidth<T extends HTMLElement>() {
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

/** Resolves a lesson's diagram reference into something the viewer can draw. */
export function compileDiagram(d: DiagramRef): CompiledPlay {
  if (d.playId) {
    const play = playById(d.playId);
    return compilePlay(play, formationById(play.formationId), formationById(play.defenseFormationId));
  }
  const f = formationById(d.formationId!);
  const other = DEFAULT_OPPONENT[f.variant];
  return f.side === "offense"
    ? compileFormations(f, formationById(other.defense))
    : compileFormations(formationById(other.offense), f);
}

interface Props {
  compiled: CompiledPlay;
  highlight?: string[];
  /** Show run, pause, reset and the scrub bar. Off for still formations. */
  controls?: boolean;
  /** When set, tapping a player reports it instead of showing the position card. */
  onTapPlayer?: (player: FormationPlayer, side: Side) => void;
  /** Player id drawn as selected. */
  selectedPlayerId?: string | null;
  /** Show the tap-a-player info card under the field. */
  infoCard?: boolean;
}

/** A field with optional playback controls and the tap-to-learn card. Used by lessons, quizzes, and the Play Lab. */
export function Diagram({ compiled, highlight, controls, onTapPlayer, selectedPlayerId, infoCard = true }: Props) {
  const animated = compiled.play.assignments.length > 0;
  const clock = usePlayClock(compiled.duration, compiled.play.id);
  const { ref, width } = useContainerWidth<HTMLDivElement>();
  const [selected, setSelected] = useState<{ player: FormationPlayer; side: Side } | null>(null);
  useEffect(() => setSelected(null), [compiled.play.id]);
  const [overflows, setOverflows] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // On narrow screens the stage is wider than the container; start scrolled to the ball
  // and show a hint until the kid scrolls sideways once.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handle = requestAnimationFrame(() => {
      el.scrollLeft = Math.max(0, (el.scrollWidth - el.clientWidth) / 2);
      setOverflows(el.scrollWidth > el.clientWidth + 4);
      setScrolled(false);
    });
    return () => cancelAnimationFrame(handle);
  }, [ref, width, compiled.play.variant]);

  const showControls = controls ?? animated;
  const info = selected ? positions[selected.player.position] : null;
  const select = useMemo(
    () => onTapPlayer ?? ((player: FormationPlayer, side: Side) => setSelected({ player, side })),
    [onTapPlayer],
  );

  return (
    <div className="diagram">
      <div ref={ref} className="stage-wrap" onScroll={() => setScrolled(true)}>
        <PlayViewer
          compiled={compiled}
          time={clock.time}
          widthPx={width}
          highlight={highlight}
          selectedPlayerId={selectedPlayerId ?? selected?.player.id ?? null}
          onSelectPlayer={select}
        />
      </div>

      {overflows && !scrolled && (
        <p className="scroll-hint" aria-live="polite">
          ◀ Slide the field sideways to see everyone ▶
        </p>
      )}

      {showControls && (
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
      )}

      {infoCard && !onTapPlayer && (
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
      )}
    </div>
  );
}
