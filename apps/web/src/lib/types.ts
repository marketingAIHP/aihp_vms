export type AppRole = "admin" | "site_manager";

export type VisitorStatus = "CHECKED_IN" | "CHECKED_OUT";

export interface AppSession {
  email: string;
  name: string;
  role: AppRole;
  rememberMe: boolean;
}

export interface SiteRecord {
  id: string;
  name: string;
  address: string;
  imageUrl?: string;
  isActive: boolean;
}

export interface SiteManagerRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  siteId: string;
  siteName: string;
  isActive: boolean;
}

export interface VisitRecord {
  id: string;
  visitorName: string;
  mobileNumber: string;
  email: string;
  companyName: string;
  purposeOfVisit: string;
  personToMeet: string;
  remarks: string;
  siteId: string;
  siteName: string;
  siteManagerId: string;
  siteManagerName: string;
  photoUrl?: string;
  status: VisitorStatus;
  checkInAt: string;
  checkOutAt?: string;
}

export interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  channels: Array<"email" | "sms" | "whatsapp">;
  roleTargets: AppRole[];
}

export interface AuditLogRecord {
  id: string;
  action: string;
  actorEmail: string;
  actorRole: AppRole;
  targetType: string;
  targetId: string;
  detail: string;
  createdAt: string;
}

export interface ReportSummary {
  visitorsToday: number;
  checkedIn: number;
  checkedOut: number;
  totalVisitors: number;
  totalSites: number;
  totalSiteManagers: number;
}

export interface SettingsRecord {
  companyName: string;
  companyAddress: string;
  supportEmail: string;
  notificationChannels: Array<"email" | "sms" | "whatsapp">;
  visitorPolicy: string;
  securityMode: "standard" | "strict";
}
