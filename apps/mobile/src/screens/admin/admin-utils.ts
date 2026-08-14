import type { UserRecord, VisitRecord } from "../../types/vms";

export function sortByScheduledAt(records: VisitRecord[]) {
  return [...records].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  );
}

export function getRecentCheckIns(records: VisitRecord[]) {
  return [...records]
    .filter((record) => record.status === "CHECKED_IN")
    .sort((left, right) => {
      const leftTime = new Date(left.checkedInAt ?? left.createdAt).getTime();
      const rightTime = new Date(right.checkedInAt ?? right.createdAt).getTime();
      return rightTime - leftTime;
    });
}

export function getTodayVisitHistory(records: VisitRecord[]) {
  const today = new Date().toDateString();
  return records.filter(
    (record) =>
      record.checkedOutAt &&
      new Date(record.checkedOutAt).toDateString() === today
  );
}

export function getActiveVisitors(records: VisitRecord[]) {
  return records.filter((record) => record.status === "CHECKED_IN");
}

export function getActiveUsers(records: UserRecord[]) {
  return records.filter((record) => record.status === "active");
}

export function countVisitsForToday(records: VisitRecord[]) {
  const today = new Date().toDateString();
  return records.filter((record) => {
    const reference = record.checkedInAt ?? record.createdAt;
    return new Date(reference).toDateString() === today;
  }).length;
}
