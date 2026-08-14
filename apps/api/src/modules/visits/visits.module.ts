import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { VisitsController } from "./visits.controller";
import { VisitsService } from "./visits.service";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [VisitsController],
  providers: [VisitsService],
  exports: [VisitsService]
})
export class VisitsModule {}
