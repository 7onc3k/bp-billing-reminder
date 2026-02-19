/**
 * Count business days between two dates (exclusive of start, inclusive of end).
 * Excludes weekends (Sat, Sun) and provided holidays.
 */
export function countBusinessDays(
  from: Date,
  to: Date,
  holidays: Date[] = [],
): number {
  const holidaySet = new Set(
    holidays.map((d) => d.toISOString().slice(0, 10)),
  );

  let count = 0;
  const current = new Date(from);

  const direction = to >= from ? 1 : -1;

  if (direction === 1) {
    while (current < to) {
      current.setDate(current.getDate() + 1);
      const day = current.getDay();
      const dateStr = current.toISOString().slice(0, 10);
      if (day !== 0 && day !== 6 && !holidaySet.has(dateStr)) {
        count++;
      }
    }
  } else {
    while (current > to) {
      current.setDate(current.getDate() - 1);
      const day = current.getDay();
      const dateStr = current.toISOString().slice(0, 10);
      if (day !== 0 && day !== 6 && !holidaySet.has(dateStr)) {
        count++;
      }
    }
  }

  return count;
}

/**
 * Subtract N business days from a date.
 * Returns the date that is N business days before the given date.
 */
export function subtractBusinessDays(
  from: Date,
  days: number,
  holidays: Date[] = [],
): Date {
  const holidaySet = new Set(
    holidays.map((d) => d.toISOString().slice(0, 10)),
  );

  const result = new Date(from);
  let remaining = days;

  while (remaining > 0) {
    result.setDate(result.getDate() - 1);
    const day = result.getDay();
    const dateStr = result.toISOString().slice(0, 10);
    if (day !== 0 && day !== 6 && !holidaySet.has(dateStr)) {
      remaining--;
    }
  }

  return result;
}
