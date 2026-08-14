import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient } from "@supabase/supabase-js";
import type { Request } from "express";
import { PrismaService } from "../../prisma/prisma.service";

type RequestUser = {
  accessToken: string;
  email: string;
  role: "admin" | "site_manager";
  sub: string;
};

type ProfileRecord = {
  email: string | null;
  id: string;
  role: string;
  status: boolean;
};

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request & { user?: RequestUser }>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException("Missing access token");
    }

    const supabase = createClient(
      this.configService.getOrThrow<string>("SUPABASE_URL"),
      this.configService.getOrThrow<string>("SUPABASE_ANON_KEY"),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const {
      data: { user },
      error
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedException("Invalid access token");
    }

    const profile = await this.prisma.user.findUnique({
      where: { id: user.id }
    }) as ProfileRecord | null;

    if (!profile || !profile.status) {
      throw new UnauthorizedException("Your user profile could not be found.");
    }

    if (profile.role !== "admin" && profile.role !== "host" && profile.role !== "site_manager") {
      throw new UnauthorizedException("This account is not authorized to use this application.");
    }

    request.user = {
      accessToken: token,
      sub: user.id,
      email: user.email ?? profile.email ?? "",
      role: profile.role === "admin" ? "admin" : "site_manager"
    };

    return true;
  }

  private extractToken(request: Request) {
    const header = request.headers.authorization;
    if (!header) {
      return "";
    }

    const [type, token] = header.split(" ");
    if (type !== "Bearer" || !token) {
      return "";
    }

    return token.trim();
  }
}
