import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { DashboardService } from "./dashboard.service";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";

type AuthenticatedRequest = Request & {
  user: {
    role: "admin" | "site_manager";
    sub: string;
  };
};

@Controller("dashboard")
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles("admin", "site_manager")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("snapshot")
  getSnapshot(@Req() request: AuthenticatedRequest) {
    return this.dashboardService.getSnapshot(request.user);
  }
}
