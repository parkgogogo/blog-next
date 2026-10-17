const longDate = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "Asia/Shanghai",
});

const shortDate = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "Asia/Shanghai",
});

export function formatLongDate(date: string): string {
  return longDate.format(new Date(date));
}

export function formatShortDate(date: string): string {
  return shortDate.format(new Date(date));
}
