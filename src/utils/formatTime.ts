export function formatTime(timeInSeconds: number): string {
  const clamped = Math.max(0, Math.floor(timeInSeconds || 0));
  const minutes = Math.floor(clamped / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (clamped % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}
