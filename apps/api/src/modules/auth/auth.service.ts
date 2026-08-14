import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient } from "@supabase/supabase-js";
import { PrismaService } from "../../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";

type AuthUser = {
  email: string | null;
  fullName: string;
  id: string;
  role: string;
  status: boolean;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {}

  async login(payload: LoginDto) {
    const supabase = this.createSupabaseAuthClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: payload.email.trim(),
      password: payload.password
    });

    if (error || !data.user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: data.user.id }
    }) as AuthUser | null;

    if (!user || !user.status) {
      await supabase.auth.signOut();
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!this.isSupportedRole(user.role)) {
      await supabase.auth.signOut();
      throw new UnauthorizedException("This account is not authorized to use this application.");
    }

    return this.createSession(user, data.session.access_token, data.session.refresh_token, data.session.expires_in);
  }

  async refresh(refreshToken: string) {
    const token = refreshToken.trim();
    if (!token) {
      throw new UnauthorizedException("Refresh token is required");
    }

    const supabase = this.createSupabaseAuthClient();
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: token
    });

    if (error || !data.user || !data.session) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: data.user.id }
    });

    if (!user || !user.status || !this.isSupportedRole(user.role)) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    return this.createSession(user, data.session.access_token, data.session.refresh_token, data.session.expires_in);
  }

  async logout(accessToken: string) {
    const supabase = createClient(
      this.configService.getOrThrow<string>("SUPABASE_URL"),
      this.getSupabaseServerKey(),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    const { error } = await supabase.auth.admin.signOut(accessToken, "local");
    if (error) {
      throw new UnauthorizedException("Unable to revoke session");
    }

    return { success: true };
  }

  private createSession(user: AuthUser, accessToken: string, refreshToken: string, expiresIn: number | null) {
    const publicRole = this.toPublicRole(user.role);

    return {
      accessToken,
      refreshToken,
      expiresIn: expiresIn ?? 0,
      user: {
        id: user.id,
        name: user.fullName,
        email: user.email ?? "",
        role: publicRole
      }
    };
  }

  private toPublicRole(role: AuthUser["role"]) {
    return role === "admin" ? "admin" : "site_manager";
  }

  private isSupportedRole(role: AuthUser["role"]) {
    return role === "admin" || role === "host" || role === "site_manager";
  }

  private createSupabaseAuthClient() {
    const url = this.configService.getOrThrow<string>("SUPABASE_URL");
    const key = this.configService.getOrThrow<string>("SUPABASE_ANON_KEY");

    return createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  private getSupabaseServerKey() {
    const key = this.configService.get<string>("SUPABASE_SECRET_KEY")
      ?? this.configService.get<string>("SUPABASE_SERVICE_ROLE_KEY");

    if (!key) {
      throw new Error("SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is required.");
    }

    return key;
  }
}
