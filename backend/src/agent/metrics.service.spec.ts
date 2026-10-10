import { MetricsService } from "./metrics.service.js";

describe("MetricsService", () => {
  const metrics = new MetricsService();

  it("returns metrics for a known service, ignoring case", () => {
    const result = metrics.getServiceHealth("DataBase") as Record<string, unknown>;
    expect(result.service).toBe("DataBase");
    expect(result.status).toBe("DEGRADED");
    expect(typeof result.timestamp).toBe("string");
  });

  it("lists the available services when the name is unknown", () => {
    const result = metrics.getServiceHealth("payment-service") as { error: string };
    expect(result.error).toContain("not recognized");
    expect(result.error).toContain("database");
    expect(result.error).toContain("auth-service");
  });
});
