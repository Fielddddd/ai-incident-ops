import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenAI } from "@google/genai";
import { GEMINI_CLIENT } from "./gemini.constants.js";

@Global()
@Module({
  providers: [
    {
      provide: GEMINI_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new GoogleGenAI({ apiKey: config.getOrThrow<string>("GEMINI_API_KEY") }),
    },
  ],
  exports: [GEMINI_CLIENT],
})
export class GeminiModule {}
