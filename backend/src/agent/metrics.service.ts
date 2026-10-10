import { Injectable } from "@nestjs/common";

// Mock telemetry — swap the body for a real metrics source later without touching the agent.
const SERVICE_METRICS: Record<string, Record<string, unknown>> = {
  database: {
    status: "DEGRADED",
    latencyMs: 820,
    activeConnections: 98,
    maxConnections: 100,
    errorRatePct: 4.8,
  },
  "api-gateway": {
    status: "HEALTHY",
    latencyMs: 35,
    activeConnections: 120,
    maxConnections: 2000,
    errorRatePct: 0.01,
  },
  "auth-service": {
    status: "HEALTHY",
    latencyMs: 50,
    activeConnections: 45,
    maxConnections: 500,
    errorRatePct: 0.0,
  },
};

@Injectable()
export class MetricsService {
  getServiceHealth(serviceName: string) {
    const service = SERVICE_METRICS[serviceName.toLowerCase()];
    if (!service) {
      return {
        error: `Service "${serviceName}" not recognized. Available services: ${Object.keys(SERVICE_METRICS).join(", ")}`,
      };
    }
    return { service: serviceName, ...service, timestamp: new Date().toISOString() };
  }
}
