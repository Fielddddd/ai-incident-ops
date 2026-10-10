import { Module } from "@nestjs/common";
import { RagModule } from "../rag/rag.module.js";
import { AgentController } from "./agent.controller.js";
import { AgentService } from "./agent.service.js";
import { MetricsService } from "./metrics.service.js";

@Module({
  imports: [RagModule],
  controllers: [AgentController],
  providers: [AgentService, MetricsService],
})
export class AgentModule {}
