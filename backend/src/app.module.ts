import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { SupabaseModule } from "./supabase/supabase.module.js";
import { GeminiModule } from "./gemini/gemini.module.js";
import { RagModule } from "./rag/rag.module.js";
import { AgentModule } from "./agent/agent.module.js";
import { IncidentModule } from "./incident/incident.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    GeminiModule,
    RagModule,
    AgentModule,
    IncidentModule,
  ],
})
export class AppModule {}
