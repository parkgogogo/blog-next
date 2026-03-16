import { format } from "date-fns";

export function parseDateValue(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const normalizedValue =
    typeof value === "string" ? value.trim() : value;

  if (normalizedValue === "") {
    return null;
  }

  const parsedDate = new Date(normalizedValue);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

export function normalizeDateString(value: unknown): string {
  return parseDateValue(value)?.toISOString() || "";
}

export function formatDateLabel(
  value: unknown,
  pattern = "d MMM, yyyy"
): string | null {
  const parsedDate = parseDateValue(value);
  return parsedDate ? format(parsedDate, pattern) : null;
}

export function getDateSortTime(value: unknown): number {
  return parseDateValue(value)?.getTime() || 0;
}
