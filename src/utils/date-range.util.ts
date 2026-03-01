export function buildDateRange(startDate?: string, endDate?: string) {
  const range: { start?: Date; end?: Date } = {};

  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    range.start = start;
  }

  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    range.end = end;
  }

  return range;
}
