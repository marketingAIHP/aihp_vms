import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./modules/auth/auth.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { PrismaModule } from "./prisma/prisma.module";
import { VisitsModule } from "./modules/visits/visits.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    PrismaModule,
    AuthModule,
    VisitsModule,
    DashboardModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
