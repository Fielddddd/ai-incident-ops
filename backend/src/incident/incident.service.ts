import { Injectable } from "@nestjs/common";

@Injectable()
export class IncidentService {
  health() {
    return { status: "ok" };
  }
}
