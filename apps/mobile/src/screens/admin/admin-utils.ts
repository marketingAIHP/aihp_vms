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

function isSameCalendarDay(iso: string | null | undefined, day = new Date()) {
  if (!iso) {
    return false;
  }

  return new Date(iso).toDateString() === day.toDateString();
}

export function getTodayVisitHistory(records: VisitRecord[]) {
  return records.filter((record) => isSameCalendarDay(record.checkedOutAt));
}

export function getTodaysCheckedIn(records: VisitRecord[]) {
  return records.filter(
    (record) => record.status === "CHECKED_IN" && isSameCalendarDay(record.checkedInAt ?? record.createdAt)
  );
}

export function getActiveVisitors(records: VisitRecord[]) {
  return records.filter((record) => record.status === "CHECKED_IN");
}

export function getActiveUsers(records: UserRecord[]) {
  return records.filter((record) => record.status === "active");
}

export function countVisitsForToday(records: VisitRecord[]) {
  return records.filter((record) => isSameCalendarDay(record.checkedInAt ?? record.createdAt)).length;
}
