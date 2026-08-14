import type { SessionRole } from "../store/session-store";

export type VisitStatus =
  | "CHECKED_IN"
  | "CHECKED_OUT";

export interface VisitRecord {
  id: string;
  visitorName: string;
  company: string;
  purpose: string;
  category: string;
  mobile: string;
  email: string;
  siteManagerId: string;
  siteManagerName: string;
  building: string;
  floor: string;
  room: string;
  createdAt: string;
  status: VisitStatus;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  notes?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  targetRoles: SessionRole[];
  readBy: string[];
}

export interface AuditItem {
  id: string;
  createdAt: string;
  actorName: string;
  actorRole: SessionRole;
  action: string;
  target: string;
  targetId: string;
  detail: string;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  mobileNumber: string;
  role: SessionRole;
  siteName: string;
  status: "active" | "inactive";
}

export interface MasterData {
  buildings: string[];
  floors: string[];
  rooms: string[];
  purposes: string[];
  categories: string[];
}
