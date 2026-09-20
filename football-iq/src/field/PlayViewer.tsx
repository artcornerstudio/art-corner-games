import { useMemo } from "react";
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
  onSelectPlayer: (player: FormationPlayer, side: Side) => void;
  selectedPlayerId: string | null;
}

/** Draws one moment of a play: the field, every player token, and the ball. */
export function PlayViewer({ compiled, time, widthPx, onSelectPlayer, selectedPlayerId }: Props) {
  const { play, offense, defense } = compiled;
  const view = useMemo(() => makeViewport(play.variant, widthPx), [play.variant, widthPx]);
  const frame = frameAt(compiled, time);

  const radius = Math.min(12, Math.max(6, view.scale * 0.95));
  const hitRadius = Math.max(radius, 16);
  const fontSize = Math.max(8, radius * 1.05);

  const token = (p: FormationPlayer, side: Side) => {
    const pos = toPx(view, frame.players.get(p.id)!);
    const label = p.label ?? p.position;
    const selected = selectedPlayerId === p.id;
    const color = side === "offense" ? COLORS.offense : COLORS.defense;
    const hasBall = frame.carrier === p.id;
    const stroke = selected ? COLORS.selected : hasBall ? COLORS.ball : "#ffffff";
    const strokeWidth = selected || hasBall ? 3 : 1.5;
    const select = () => onSelectPlayer(p, side);
    return (
      <Group key={p.id} x={pos.x} y={pos.y} onClick={select} onTap={select}>
        {/* Larger invisible hit area so small fingers can tap a token. */}
        <Circle radius={hitRadius} fill="transparent" />
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
    <Stage width={view.widthPx} height={view.heightPx} style={{ width: view.widthPx, height: view.heightPx }}>
      <Layer>
        <Field view={view} />
      </Layer>
      <Layer>
        {defense.players.map((p) => token(p, "defense"))}
        {offense.players.map((p) => token(p, "offense"))}
        <Group x={ballPx.x} y={ballPx.y} listening={false}>
          <Circle radius={radius * 0.45} fill={COLORS.ball} stroke="#5d4037" strokeWidth={1.5} scaleX={1.35} />
        </Group>
      </Layer>
    </Stage>
  );
}
