import { useMemo } from "react";
import type Konva from "konva";
import { Circle, Group, Layer, Line, Stage, Text } from "react-konva";
import type { FormationPlayer, Side } from "../types/play";
import { frameAt, type CompiledPlay } from "./animation";
import { COLORS, Field } from "./Field";
import { makeViewport, toPx } from "./geometry";

interface Props {
  compiled: CompiledPlay;
  /** Seconds since the snap. The parent owns the clock. */
  time: number;
  widthPx: number;
  /** Fired when a kid taps a player token. */
  onSelectPlayer?: (player: FormationPlayer, side: Side) => void;
  selectedPlayerId?: string | null;
  /** Player ids drawn with a ring while everyone else fades. */
  highlight?: string[];
  /** When false, highlighted players get a ring but nobody fades. */
  dimOthers?: boolean;
}

/** Draws one moment of a play: the field, every player token, and the ball. */
export function PlayViewer({ compiled, time, widthPx, onSelectPlayer, selectedPlayerId = null, highlight, dimOthers = true }: Props) {
  const { play, offense, defense } = compiled;
  const view = useMemo(() => makeViewport(play.variant, widthPx, play.view, play.losYard), [play.variant, widthPx, play.view, play.losYard]);
  const frame = frameAt(compiled, time);
  const highlightSet = highlight && highlight.length > 0 ? new Set(highlight) : null;

  const radius = Math.min(12, Math.max(6, view.scale * 0.95));
  const fontSize = Math.max(8, radius * 1.05);
  /** How far from a token a tap can land and still count, in pixels. Generous for small fingers. */
  const tapReach = Math.max(radius + 6, 22);

  // One handler on the stage picks the nearest token, so crowded linemen never steal a tap
  // from the player underneath them the way per-token hit areas would.
  const handleTap = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!onSelectPlayer) return;
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    type Hit = { player: FormationPlayer; side: Side; d: number };
    const hits: Hit[] = [];
    const consider = (p: FormationPlayer, side: Side) => {
      const at = toPx(view, frame.players.get(p.id)!);
      const d = Math.hypot(at.x - pos.x, at.y - pos.y);
      if (d <= tapReach) hits.push({ player: p, side, d });
    };
    for (const p of offense.players) consider(p, "offense");
    for (const p of defense.players) consider(p, "defense");
    hits.sort((a, b) => a.d - b.d);
    if (hits[0]) onSelectPlayer(hits[0].player, hits[0].side);
  };

  const token = (p: FormationPlayer, side: Side) => {
    const pos = toPx(view, frame.players.get(p.id)!);
    const label = p.label ?? p.position;
    const selected = selectedPlayerId === p.id;
    const lit = highlightSet?.has(p.id) ?? false;
    const dimmed = highlightSet && dimOthers ? !lit : false;
    const color = side === "offense" ? COLORS.offense : COLORS.defense;
    const hasBall = frame.carrier === p.id;
    const stroke = selected ? COLORS.selected : hasBall ? COLORS.ball : "#ffffff";
    const strokeWidth = selected || hasBall ? 3 : 1.5;
    return (
      <Group key={p.id} x={pos.x} y={pos.y} opacity={dimmed ? 0.35 : 1} listening={false}>
        {lit && <Circle radius={radius + 5} stroke={COLORS.los} strokeWidth={3} listening={false} />}
        <Circle radius={radius} fill={color} stroke={stroke} strokeWidth={strokeWidth} />
        {side === "offense" ? (
          <Text
            text={label}
            fontSize={fontSize}
            fontStyle="bold"
            fill="#ffffff"
            width={radius * 2}
            height={radius * 2}
            offsetX={radius}
            offsetY={radius}
            align="center"
            verticalAlign="middle"
            listening={false}
          />
        ) : (
          <Group listening={false}>
            <Line points={[-radius * 0.5, -radius * 0.5, radius * 0.5, radius * 0.5]} stroke="#ffffff" strokeWidth={2} />
            <Line points={[-radius * 0.5, radius * 0.5, radius * 0.5, -radius * 0.5]} stroke="#ffffff" strokeWidth={2} />
            <Text text={label} fontSize={fontSize * 0.8} fontStyle="bold" fill="#ffffff" y={radius + 1} width={radius * 4} offsetX={radius * 2} align="center" />
          </Group>
        )}
      </Group>
    );
  };

  const ballPx = toPx(view, frame.ball);

  return (
    <Stage width={view.widthPx} height={view.heightPx} style={{ width: view.widthPx, height: view.heightPx }} onClick={handleTap} onTap={handleTap}>
      <Layer>
        <Field view={view} />
      </Layer>
      <Layer listening={false}>
        {defense.players.map((p) => token(p, "defense"))}
        {offense.players.map((p) => token(p, "offense"))}
        <Group x={ballPx.x} y={ballPx.y} listening={false}>
          <Circle radius={radius * 0.45} fill={COLORS.ball} stroke="#5d4037" strokeWidth={1.5} scaleX={1.35} />
        </Group>
      </Layer>
    </Stage>
  );
}
