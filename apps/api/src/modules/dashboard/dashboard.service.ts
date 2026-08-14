import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

type DashboardVisit = {
  id: string;
  visitorName: string;
  company: string;
  purpose: string;
  siteManagerId: string;
  siteManagerName: string;
  building: string;
  floor: string;
  room: string;
  createdAt: Date;
  checkedInAt: Date | null;
  checkedOutAt: Date | null;
  status: string;
  siteManager: { fullName: string; company: string | null };
};

type AuthenticatedUser = {
  role: "admin" | "site_manager";
  sub: string;
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSnapshot(user: AuthenticatedUser) {
    const assignedSite = await this.getAssignedSite(user);
    const where = assignedSite ? { building: assignedSite } : {};
    const nowInIndia = new Date(Date.now() + 330 * 60 * 1000);
    const startOfToday = new Date(Date.UTC(
      nowInIndia.getUTCFullYear(),
      nowInIndia.getUTCMonth(),
      nowInIndia.getUTCDate()
    ) - 330 * 60 * 1000);
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

    const [totalVisits, checkedIn, checkedOut, visitorsToday, visits] = await this.prisma.$transaction([
      this.prisma.visit.count({ where }),
      this.prisma.visit.count({ where: { ...where, status: "CHECKED_IN" } }),
      this.prisma.visit.count({ where: { ...where, status: { in: ["EXITED", "CHECKED_OUT"] } } }),
      this.prisma.visit.count({
        where: { ...where, checkedInAt: { gte: startOfToday, lt: endOfToday } }
      }),
      this.prisma.visit.findMany({
        where,
        include: {
          siteManager: true
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 20
      })
    ]);

    const recentVisits = visits as DashboardVisit[];

    return {
      summary: {
        totalVisits,
        activeVisitors: checkedIn,
        checkedOut,
        checkedIn,
        visitorsToday
      },
      visits: recentVisits.map((visit) => ({
        id: visit.id,
        visitorName: visit.visitorName,
        company: visit.company,
        purpose: visit.purpose,
        siteManagerId: visit.siteManagerId,
        siteManagerName: visit.siteManagerName || visit.siteManager.fullName,
        building: visit.building,
        floor: visit.floor,
        room: visit.room,
        createdAt: visit.createdAt.toISOString(),
        checkedInAt: visit.checkedInAt?.toISOString() ?? null,
        checkedOutAt: visit.checkedOutAt?.toISOString() ?? null,
        status: visit.checkedOutAt ? "CHECKED_OUT" : "CHECKED_IN"
      }))
    };
  }

  private async getAssignedSite(user: AuthenticatedUser) {
    if (user.role === "admin") {
      return null;
    }

    const profile = await this.prisma.user.findFirst({
      where: {
        id: user.sub,
        role: { in: ["host", "site_manager"] },
        status: true
      },
      select: { company: true }
    });

    if (!profile?.company) {
      throw new ForbiddenException("No active site is assigned to this Site Manager.");
    }

    return profile.company;
  }
}
