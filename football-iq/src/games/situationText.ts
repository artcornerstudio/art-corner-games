/** Plain-text helpers for down, distance, and field position. No content imports, so scripts can use them too. */

export function describeSpot(yardLine: number): string {
  if (yardLine === 50) return "midfield";
  return yardLine < 50 ? `your own ${yardLine}` : `the other team's ${100 - yardLine}`;
}

export function downLabel(down: number, distance: number, yardLine: number): string {
  const ordinal = ["1st", "2nd", "3rd", "4th"][down - 1];
  const goal = yardLine + distance >= 100;
  return `${ordinal} and ${goal ? "goal" : distance}`;
}
