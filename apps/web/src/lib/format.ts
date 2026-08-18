export function formatDate(date: string) {
  return new Date(date).toLocaleDateString();
}

export function formatDateTime(date: string) {
  return new Date(date).toLocaleString();
}

export function formatCount(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

