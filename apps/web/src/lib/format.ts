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
