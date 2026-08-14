import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "../../prisma/prisma.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { RolesGuard } from "./roles.guard";
import { SupabaseAuthGuard } from "./supabase-auth.guard";

@Module({
  imports: [
    ConfigModule,
    PrismaModule
  ],
  controllers: [AuthController],
  providers: [AuthService, RolesGuard, SupabaseAuthGuard],
  exports: [AuthService, RolesGuard, SupabaseAuthGuard]
})
export class AuthModule {}
