/**
 * Integration + Unit Tests – verifying all 10 core requirements.
 */
import request from "supertest";
import { app } from "../src/api/server";
import { MetricsTracker } from "../src/core/MetricsTracker";
import { ReportController } from "../src/api/controllers/ReportController";

// ──────────────────────────────────────────────────────────
// Reset global state before each test to guarantee isolation
// ──────────────────────────────────────────────────────────
beforeEach(() => {
  MetricsTracker.reset();
  ReportController.seedReports();   // Rebuilds all proxies from scratch
});

// ──────────────────────────────────────────────────────────
// 1. metrics-tracking-system
// ──────────────────────────────────────────────────────────
describe("metrics-tracking-system", () => {
  it("GET /api/metrics returns 200 with total_instantiations = 0 on fresh start", async () => {
    const res = await request(app).get("/api/metrics");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("total_instantiations");
    expect(res.body.total_instantiations).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────
// 2. list-reports-lazy-behavior
// ──────────────────────────────────────────────────────────
describe("list-reports-lazy-behavior", () => {
  it("GET /api/reports returns exactly 3 seeded reports", async () => {
    const res = await request(app).get("/api/reports");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(3);

    const ids = res.body.map((r: any) => r.id);
    expect(ids).toContain("report-1");
    expect(ids).toContain("report-2");
    expect(ids).toContain("report-3");
  });

  it("Report list has correct titles and required_roles", async () => {
    const res = await request(app).get("/api/reports");
    const map: Record<string, any> = {};
    res.body.forEach((r: any) => { map[r.id] = r; });

    expect(map["report-1"].title).toBe("Financial Q1");
    expect(map["report-1"].required_role).toBe("admin");

    expect(map["report-2"].title).toBe("User Analytics");
    expect(map["report-2"].required_role).toBe("manager");

    expect(map["report-3"].title).toBe("System Status");
    expect(map["report-3"].required_role).toBe("guest");
  });

  it("Listing reports does NOT instantiate HeavyReportGenerator (total_instantiations remains 0)", async () => {
    await request(app).get("/api/reports");
    const metrics = await request(app).get("/api/metrics");
    expect(metrics.body.total_instantiations).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────
// 3. generate-report-instantiation
// ──────────────────────────────────────────────────────────
describe("generate-report-instantiation", () => {
  it("First generate call triggers lazy instantiation: total_instantiations becomes 1", async () => {
    const gen = await request(app).get("/api/reports/report-3/generate?role=guest");
    expect(gen.status).toBe(200);
    expect(gen.body).toHaveProperty("id", "report-3");
    expect(gen.body).toHaveProperty("content");

    const metrics = await request(app).get("/api/metrics");
    expect(metrics.body.total_instantiations).toBe(1);
  });
});

// ──────────────────────────────────────────────────────────
// 4. virtual-proxy-caching
// ──────────────────────────────────────────────────────────
describe("virtual-proxy-caching", () => {
  it("Subsequent calls to the same report reuse the instance: total_instantiations stays 1", async () => {
    // First call – creates the heavy object
    await request(app).get("/api/reports/report-3/generate?role=guest");
    // Three more calls – must reuse cached instance
    await request(app).get("/api/reports/report-3/generate?role=guest");
    await request(app).get("/api/reports/report-3/generate?role=guest");
    await request(app).get("/api/reports/report-3/generate?role=guest");

    const metrics = await request(app).get("/api/metrics");
    expect(metrics.body.total_instantiations).toBe(1);
  });
});

// ──────────────────────────────────────────────────────────
// 5. protection-proxy-access-denied
// ──────────────────────────────────────────────────────────
describe("protection-proxy-access-denied", () => {
  it("Unauthorized role gets 403 and HeavyReportGenerator is NOT instantiated", async () => {
    // First make total_instantiations = 1 via report-3
    await request(app).get("/api/reports/report-3/generate?role=guest");

    // Now try report-1 (requires admin) with guest role
    const forbidden = await request(app).get("/api/reports/report-1/generate?role=guest");
    expect(forbidden.status).toBe(403);
    expect(forbidden.body).toHaveProperty("error", "Access Denied");

    // Count must remain at 1 – protection proxy short-circuited the request
    const metrics = await request(app).get("/api/metrics");
    expect(metrics.body.total_instantiations).toBe(1);
  });

  it("Returns 403 with no role parameter", async () => {
    const res = await request(app).get("/api/reports/report-1/generate");
    expect(res.status).toBe(403);
  });

  it("Manager role cannot access admin report", async () => {
    const res = await request(app).get("/api/reports/report-1/generate?role=manager");
    expect(res.status).toBe(403);
  });
});

// ──────────────────────────────────────────────────────────
// 6. protection-proxy-access-granted
// ──────────────────────────────────────────────────────────
describe("protection-proxy-access-granted", () => {
  it("Authorized role gets 200 and total_instantiations increments", async () => {
    // Start: report-3 generates (count=1), report-1 admin generates (count=2)
    await request(app).get("/api/reports/report-3/generate?role=guest");
    const before = (await request(app).get("/api/metrics")).body.total_instantiations;

    const authorized = await request(app).get("/api/reports/report-1/generate?role=admin");
    expect(authorized.status).toBe(200);
    expect(authorized.body).toHaveProperty("id", "report-1");
    expect(authorized.body).toHaveProperty("content");

    const after = (await request(app).get("/api/metrics")).body.total_instantiations;
    expect(after).toBe(before + 1);
  });

  it("Manager role can access manager report", async () => {
    const res = await request(app).get("/api/reports/report-2/generate?role=manager");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe("report-2");
  });
});

// ──────────────────────────────────────────────────────────
// 7. metrics-reset-utility
// ──────────────────────────────────────────────────────────
describe("metrics-reset-utility", () => {
  it("POST /api/metrics/reset resets counter to 0", async () => {
    // Generate something to push count > 0
    await request(app).get("/api/reports/report-3/generate?role=guest");
    const before = (await request(app).get("/api/metrics")).body.total_instantiations;
    expect(before).toBeGreaterThan(0);

    const reset = await request(app).post("/api/metrics/reset");
    expect(reset.status).toBe(200);
    expect(reset.body).toHaveProperty("message", "Metrics reset successfully");

    const after = (await request(app).get("/api/metrics")).body.total_instantiations;
    expect(after).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────
// 8. docker-compose-setup (health endpoint)
// ──────────────────────────────────────────────────────────
describe("docker-compose-setup – health endpoint", () => {
  it("GET /health returns 200 with status ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "ok");
  });
});

// ──────────────────────────────────────────────────────────
// 9. env-example-file (file existence verified via test setup)
// ──────────────────────────────────────────────────────────
import fs from "fs";
import pathModule from "path";

describe("env-example-file", () => {
  it(".env.example exists at repository root with valid KEY=VALUE format", () => {
    const envExamplePath = pathModule.resolve(__dirname, "../.env.example");
    expect(fs.existsSync(envExamplePath)).toBe(true);

    const content = fs.readFileSync(envExamplePath, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#"));
    lines.forEach((line) => {
      expect(line).toMatch(/^[A-Z_]+=.*/);
    });
  });
});

// ──────────────────────────────────────────────────────────
// 10. Non-existent report returns 404
// ──────────────────────────────────────────────────────────
describe("404 – non-existent report", () => {
  it("GET /api/reports/non-existent-report/generate?role=admin returns 404", async () => {
    const res = await request(app).get("/api/reports/non-existent-report/generate?role=admin");
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error", "Report not found");
  });

  it("GET /api/reports/non-existent-report returns 404", async () => {
    const res = await request(app).get("/api/reports/non-existent-report");
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error", "Report not found");
  });
});
