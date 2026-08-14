import crypto from "node:crypto";
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateVisitDto } from "./dto/create-visit.dto";

type VisitWithRelations = {
  id: string;
  visitorName: string;
  company: string;
  purpose: string;
  siteManagerId: string;
  floor: string;
  room: string;
  building: string;
  siteManagerName: string;
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
export class VisitsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser) {
    const assignedSite = await this.getAssignedSite(user);
    const visits = await this.prisma.visit.findMany({
      where: assignedSite ? { building: assignedSite } : undefined,
      include: {
        siteManager: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return (visits as VisitWithRelations[]).map((visit) => this.toResponse(visit));
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const assignedSite = await this.getAssignedSite(user);
    const visit = await this.prisma.visit.findFirst({
      where: {
        id,
        ...(assignedSite ? { building: assignedSite } : {})
      },
      include: {
        siteManager: true
      }
    });

    if (!visit) {
      throw new NotFoundException("Visit not found");
    }

    return this.toResponse(visit);
  }

  async create(payload: CreateVisitDto, user: AuthenticatedUser) {
    const site = await this.prisma.site.findFirst({
      where: {
        kind: "buildings",
        name: payload.building.trim(),
        isActive: true
      }
    });

    if (!site) {
      throw new BadRequestException("The selected site is not available.");
    }

    const actorProfile = user.role === "site_manager"
      ? await this.prisma.user.findFirst({
          where: {
            id: user.sub,
            role: { in: ["host", "site_manager"] },
            status: true
          }
        })
      : null;

    if (user.role === "site_manager" && !actorProfile) {
      throw new ForbiddenException("Only an active site manager can create visits for this site.");
    }

    if (
      user.role === "site_manager" &&
      (!actorProfile?.company || payload.building.trim() !== actorProfile.company)
    ) {
      throw new ForbiddenException("You can only create visits for your assigned site.");
    }

    let siteManager = actorProfile;
    if (user.role === "admin" && payload.siteManagerId) {
      siteManager = await this.prisma.user.findFirst({
          where: {
            id: payload.siteManagerId,
            role: { in: ["host", "site_manager"] },
            status: true,
            company: site.name
          }
        });

      if (!siteManager) {
        throw new BadRequestException("The selected Site Manager is not assigned to this site.");
      }
    } else if (user.role === "admin") {
      siteManager = await this.prisma.user.findFirst({
          where: {
            role: { in: ["host", "site_manager"] },
            status: true,
            company: site.name
          },
          orderBy: {
            createdAt: "asc"
          }
        });
    }

    if (!siteManager) {
      throw new BadRequestException("No active Site Manager is assigned to this site.");
    }

    const now = new Date();
    const visit = await this.prisma.visit.create({
      data: {
        visitorName: payload.visitorName.trim(),
        company: payload.company.trim(),
        purpose: payload.purpose.trim(),
        category: "Walk-In",
        building: site.name,
        floor: payload.floor.trim(),
        room: payload.room.trim(),
        status: "CHECKED_IN",
        scheduledAt: now,
        qrToken: crypto.randomUUID(),
        siteManagerName: siteManager.fullName,
        photoRequired: true,
        livePhotoCaptured: false,
        consentCaptured: false,
        idVerified: false,
        checkedInAt: now,
        siteManagerId: siteManager.id,
      },
      include: {
        siteManager: true
      }
    });

    return this.toResponse(visit);
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

  private toResponse(visit: VisitWithRelations) {
    return {
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
    };
  }
}
