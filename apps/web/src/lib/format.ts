const INDIA_TIME_ZONE = "Asia/Kolkata";

export function formatIndiaDate(date: Date | string = new Date()) {
  const value = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: INDIA_TIME_ZONE,
    year: "numeric",
  }).formatToParts(value);

  return ["year", "month", "day"]
    .map((type) => parts.find((part) => part.type === type)?.value)
    .join("-");
}

export function indiaToday() {
  return formatIndiaDate(new Date());
}

export function indiaDayBounds(date = indiaToday()) {
  const todayStart = new Date(`${date}T00:00:00+05:30`);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  return { today: date, todayStart, tomorrowStart };
}

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString();
}

export function formatDateTime(date: string) {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) {
    return date;
  }

  return value.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatCount(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}
