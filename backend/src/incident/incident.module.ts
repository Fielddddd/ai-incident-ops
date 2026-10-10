import { Module } from "@nestjs/common";
import { IncidentController } from "./incident.controller.js";
import { IncidentService } from "./incident.service.js";

@Module({
  controllers: [IncidentController],
  providers: [IncidentService],
})
export class IncidentModule {}
