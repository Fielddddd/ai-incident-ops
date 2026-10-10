import { Body, Controller, Post, Res } from "@nestjs/common";
import { RagService } from "./rag.service.js";
import { AskDto } from "./dto/ask.dto.js";
import { streamNdjson, type WritableResponse } from "../common/stream.js";

@Controller("rag")
export class RagController {
  constructor(private readonly rag: RagService) {}

  @Post("ask")
  ask(@Body() dto: AskDto) {
    return this.rag.answer(dto.question, dto.history);
  }

  // Same as /ask but sends the sources first and then the answer text as it is written
  // (one JSON object per line).
  @Post("ask/stream")
  async askStream(@Body() dto: AskDto, @Res() res: WritableResponse) {
    await streamNdjson(res, this.rag.answerStream(dto.question, dto.history));
  }
}
