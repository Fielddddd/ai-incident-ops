import { Controller, Get } from "@nestjs/common";
import { IncidentService } from "./incident.service.js";

@Controller("incidents")
export class IncidentController {
  constructor(private readonly incidentService: IncidentService) {}

  @Get("health")
  health() {
    return this.incidentService.health();
  }
}
