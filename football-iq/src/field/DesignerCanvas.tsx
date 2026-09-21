import { useMemo } from "react";
import type Konva from "konva";
import { Arrow, Circle, Group, Layer, Line, Stage, Text } from "react-konva";
import type { Formation, FormationPlayer, Point, Variant } from "../types/play";
import { COLORS, Field } from "./Field";
import { makeViewport, toPx, type Viewport } from "./geometry";

export type DesignerMode = "move" | "route";

interface Props {
  variant: Variant;
  players: FormationPlayer[];
  defense: Formation;
  routes: Record<string, Point[]>;
  /** Player ids allowed to run routes; others are drawn muted in route mode. */
  eligible: Set<string>;
  selectedId: string | null;
  target: string | null;
  mode: DesignerMode;
  widthPx: number;
  onMovePlayer: (id: string, to: Point) => void;
  onSelectPlayer: (id: string | null) => void;
  onAddWaypoint: (id: string, p: Point) => void;
}

function toYards(v: Viewport, px: Point): Point {
  const x = px.x / v.scale - v.spec.width / 2;
  const y = v.ahead - px.y / v.scale;
  return { x: Math.round(x * 2) / 2, y: Math.round(y * 2) / 2 };
}

function clampToField(v: Viewport, p: Point): Point {
  const half = v.spec.width / 2 - 0.6;
  return { x: Math.max(-half, Math.min(half, p.x)), y: Math.max(-v.behind + 0.5, Math.min(v.ahead - 0.5, p.y)) };
}

/** The editable field: drag O's around, tap to select, tap the grass to add route waypoints. */
export function DesignerCanvas({ variant, players, defense, routes, eligible, selectedId, target, mode, widthPx, onMovePlayer, onSelectPlayer, onAddWaypoint }: Props) {
  const view = useMemo(() => makeViewport(variant, widthPx), [variant, widthPx]);
  const radius = Math.min(13, Math.max(7, view.scale * 1));
  const fontSize = Math.max(8, radius * 1.05);

  const stageTap = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;
    // Was the tap on a player? Pick the nearest within reach.
    let nearest: { id: string; d: number } | null = null;
    for (const p of players) {
      const at = toPx(view, p);
      const d = Math.hypot(at.x - pos.x, at.y - pos.y);
      if (d <= Math.max(radius + 6, 22) && (!nearest || d < nearest.d)) nearest = { id: p.id, d };
    }
    if (nearest) {
      onSelectPlayer(nearest.id);
      return;
    }
    if (mode === "route" && selectedId) onAddWaypoint(selectedId, clampToField(view, toYards(view, pos)));
    else onSelectPlayer(null);
  };

  const dragEnd = (p: FormationPlayer) => (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const to = clampToField(view, toYards(view, { x: node.x(), y: node.y() }));
    // Snap the node back to the rounded spot so the drawing and the data agree.
    const px = toPx(view, to);
    node.position(px);
    onMovePlayer(p.id, to);
  };

  return (
    <Stage width={view.widthPx} height={view.heightPx} style={{ width: view.widthPx, height: view.heightPx }} onClick={stageTap} onTap={stageTap}>
      <Layer>
        <Field view={view} />
      </Layer>
      <Layer listening={false}>
        {defense.players.map((d) => {
          const pos = toPx(view, d);
          return (
            <Group key={d.id} x={pos.x} y={pos.y} opacity={0.6}>
              <Circle radius={radius} fill={COLORS.defense} stroke="#fff" strokeWidth={1.5} />
              <Line points={[-radius * 0.5, -radius * 0.5, radius * 0.5, radius * 0.5]} stroke="#fff" strokeWidth={2} />
              <Line points={[-radius * 0.5, radius * 0.5, radius * 0.5, -radius * 0.5]} stroke="#fff" strokeWidth={2} />
              <Text text={d.label ?? d.position} fontSize={fontSize * 0.8} fontStyle="bold" fill="#fff" y={radius + 1} width={radius * 4} offsetX={radius * 2} align="center" />
            </Group>
          );
        })}
        {players.map((p) => {
          const path = routes[p.id];
          if (!path || path.length === 0) return null;
          const pts = [p, ...path].flatMap((pt) => {
            const px = toPx(view, pt);
            return [px.x, px.y];
          });
          const isTarget = target === p.id;
          return <Arrow key={`r-${p.id}`} points={pts} stroke={isTarget ? COLORS.los : "#ffffff"} fill={isTarget ? COLORS.los : "#ffffff"} strokeWidth={isTarget ? 4 : 3} pointerLength={8} pointerWidth={8} lineJoin="round" />;
        })}
      </Layer>
      <Layer>
        {players.map((p) => {
          const pos = toPx(view, p);
          const selected = selectedId === p.id;
          const muted = mode === "route" && !eligible.has(p.id);
          return (
            <Group key={p.id} x={pos.x} y={pos.y} draggable={mode === "move"} onDragEnd={dragEnd(p)} opacity={muted ? 0.5 : 1}>
              {selected && <Circle radius={radius + 5} stroke={COLORS.los} strokeWidth={3} />}
              {target === p.id && <Circle radius={radius + 2} stroke={COLORS.ball} strokeWidth={3} />}
              <Circle radius={radius} fill={COLORS.offense} stroke="#fff" strokeWidth={1.5} />
              <Text text={p.label ?? p.position} fontSize={fontSize} fontStyle="bold" fill="#fff" width={radius * 2} height={radius * 2} offsetX={radius} offsetY={radius} align="center" verticalAlign="middle" listening={false} />
            </Group>
          );
        })}
      </Layer>
    </Stage>
  );
}
