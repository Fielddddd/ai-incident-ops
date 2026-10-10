import { Body, Controller, Post, Res } from "@nestjs/common";
import { AgentService } from "./agent.service.js";
import { RunAgentDto } from "./dto/run-agent.dto.js";
import { streamNdjson, type WritableResponse } from "../common/stream.js";

@Controller("agent")
export class AgentController {
  constructor(private readonly agent: AgentService) {}

  @Post("run")
  run(@Body() dto: RunAgentDto) {
    return this.agent.run(dto.prompt, dto.history);
  }

  // Same as /run but sends progress as it happens (one JSON object per line).
  @Post("run/stream")
  async runStream(@Body() dto: RunAgentDto, @Res() res: WritableResponse) {
    await streamNdjson(res, this.agent.runStream(dto.prompt, dto.history));
  }
}
