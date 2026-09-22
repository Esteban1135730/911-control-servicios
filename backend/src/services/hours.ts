export function calcHoursWorked(startedAt: Date, endedAt: Date): number {
  const ms = endedAt.getTime() - startedAt.getTime();
  if (ms <= 0) return 0;
  return Math.round((ms / 3_600_000) * 10000) / 10000;
}

export function hoursOpen(startedAt: Date, now = new Date()): number {
  return calcHoursWorked(startedAt, now);
}
