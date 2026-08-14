import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { CreateVisitDto } from "./dto/create-visit.dto";
import { VisitsService } from "./visits.service";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";

type AuthenticatedRequest = Request & {
  user: {
    role: "admin" | "site_manager";
    sub: string;
  };
};

@Controller("visits")
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles("admin", "site_manager")
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.visitsService.list(request.user);
  }

  @Get(":id")
  findOne(@Param("id", new ParseUUIDPipe({ version: "4" })) id: string, @Req() request: AuthenticatedRequest) {
    return this.visitsService.findOne(id, request.user);
  }

  @Post()
  create(@Body() payload: CreateVisitDto, @Req() request: AuthenticatedRequest) {
    return this.visitsService.create(payload, request.user);
  }
}
