import { Group, Line, Rect, Text } from "react-konva";
import { VIEW_AHEAD, VIEW_BEHIND, toPx, yardLabel, type Viewport } from "./geometry";

export const COLORS = {
  grass: "#2e7d32",
  grassDark: "#2a7230",
  endZone: "#1b5e20",
  line: "#f5f5f5",
  los: "#f0e442",
  offense: "#0072b2",
  defense: "#d55e00",
  ball: "#e69f00",
  selected: "#ffffff",
};

interface Props {
  view: Viewport;
}

/** Static field art: grass, end zones, yard lines, numbers, hashes, and the line of scrimmage. */
export function Field({ view }: Props) {
  const { spec, scale, widthPx, heightPx } = view;
  const los = spec.losYard;
  const elements: JSX.Element[] = [];

  // Alternate 5-yard stripes for depth cues.
  for (let y = -VIEW_BEHIND; y < VIEW_AHEAD; y += 1) {
    const abs = los + y;
    const stripe = Math.floor(abs / 5) % 2 === 0;
    const top = toPx(view, { x: 0, y: y + 1 }).y;
    const inEndZone = abs < 0 || abs >= spec.length;
    elements.push(
      <Rect key={`s${y}`} x={0} y={top} width={widthPx} height={scale} fill={inEndZone ? COLORS.endZone : stripe ? COLORS.grass : COLORS.grassDark} />,
    );
  }

  // Yard lines every 5 yards, numbers every 10.
  for (let abs = Math.ceil((los - VIEW_BEHIND) / 5) * 5; abs <= los + VIEW_AHEAD; abs += 5) {
    const y = abs - los;
    const py = toPx(view, { x: 0, y }).y;
    const isGoal = abs === 0 || abs === spec.length;
    if (abs < 0 || abs > spec.length) continue;
    elements.push(<Line key={`l${abs}`} points={[0, py, widthPx, py]} stroke={COLORS.line} strokeWidth={isGoal ? 3 : 1.5} opacity={isGoal ? 1 : 0.85} />);
    const label = abs % 10 === 0 ? yardLabel(abs, spec) : null;
    if (label) {
      const fontSize = Math.max(10, scale * 1.6);
      elements.push(
        <Text key={`nL${abs}`} x={scale * 2} y={py - fontSize / 2} text={label} fontSize={fontSize} fontStyle="bold" fill={COLORS.line} opacity={0.9} />,
        <Text key={`nR${abs}`} x={widthPx - scale * 2 - fontSize * 1.2} y={py - fontSize / 2} text={label} fontSize={fontSize} fontStyle="bold" fill={COLORS.line} opacity={0.9} />,
      );
    }
  }

  // One-yard ticks on the sidelines and, on tackle fields, the hashes (18 ft 6 in apart in the NFL).
  const tickXs = spec.hashes
    ? [0.6, spec.width / 2 - 3.08, spec.width / 2 + 3.08, spec.width - 0.6]
    : [0.6, spec.width - 0.6];
  for (let y = -VIEW_BEHIND; y <= VIEW_AHEAD; y += 1) {
    const abs = los + y;
    if (abs % 5 === 0 || abs < 0 || abs > spec.length) continue;
    const py = toPx(view, { x: 0, y }).y;
    for (const tx of tickXs) {
      const px = tx * scale;
      elements.push(<Line key={`t${y}-${tx}`} points={[px - scale * 0.4, py, px + scale * 0.4, py]} stroke={COLORS.line} strokeWidth={1} opacity={0.7} />);
    }
  }

  // Line of scrimmage.
  const losPy = toPx(view, { x: 0, y: 0 }).y;
  elements.push(<Line key="los" points={[0, losPy, widthPx, losPy]} stroke={COLORS.los} strokeWidth={2.5} dash={[scale, scale * 0.6]} />);

  return (
    <Group>
      <Rect x={0} y={0} width={widthPx} height={heightPx} fill={COLORS.grass} />
      {elements}
    </Group>
  );
}
