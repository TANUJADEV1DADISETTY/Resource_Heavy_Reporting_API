# Resource-Heavy Reporting API — Proxy Pattern

A production-grade REST API demonstrating two variations of the **Gang-of-Four Proxy design pattern**:

| Proxy Type | Purpose |
|---|---|
| **Virtual Proxy** | Lazy initialization — defers `HeavyReportGenerator` instantiation until `generate()` is called |
| **Protection Proxy** | Access control — rejects unauthorized roles with `403 Forbidden` before touching the Virtual Proxy |

---

## Architecture

```
HTTP Client
    │
    ▼
Express API Layer (src/api/server.ts)
    │
    ▼
ProtectionReportProxy          ← outer shell: checks user role
    │  (throws AccessDeniedError on mismatch)
    ▼
VirtualReportProxy             ← middle: lazy init gate
    │  (instantiates HeavyReportGenerator only on first generate())
    ▼
HeavyReportGenerator           ← real subject: increments MetricsTracker
    │
    ▼
MetricsTracker (static)        ← global instantiation counter
```

---

## Project Structure

```
resource-heavy-reporting-api/
├── src/
│   ├── core/
│   │   ├── Report.ts                # Subject interface
│   │   ├── HeavyReportGenerator.ts  # Real subject (increments counter on ctor)
│   │   └── MetricsTracker.ts        # Global static instantiation counter
│   ├── proxies/
│   │   ├── VirtualReportProxy.ts    # Lazy-initialization proxy
│   │   └── ProtectionReportProxy.ts # Access-control proxy
│   └── api/
│       ├── controllers/
│       │   ├── ReportController.ts  # Route handlers for /api/reports
│       │   └── MetricsController.ts # Route handlers for /api/metrics
│       └── server.ts                # Express app + seeded report "database"
├── tests/
│   └── proxy.test.ts                # Integration tests (all 10 requirements)
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── tsconfig.json
└── package.json
```

---

## Quick Start — Local (No Docker)

```bash
# 1. Install dependencies
npm install

# 2. Copy env example
cp .env.example .env

# 3. Run in development mode
npm run dev

# API will be available at http://localhost:8080
```

## Quick Start — Docker

```bash
# Build & run (zero manual setup)
docker-compose up -d

# Verify health
curl http://localhost:8080/health

# View logs
docker-compose logs -f
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check (returns `{ status: "ok" }`) |
| `GET` | `/api/reports` | List all reports (metadata only, no instantiation) |
| `GET` | `/api/reports/:id` | Get metadata for a single report |
| `GET` | `/api/reports/:id/generate?role=<role>` | Generate report content (lazy init + auth check) |
| `GET` | `/api/metrics` | Get total `HeavyReportGenerator` instantiation count |
| `POST` | `/api/metrics/reset` | Reset the metrics counter to 0 |

### Seeded Reports

| ID | Title | Required Role |
|----|-------|--------------|
| `report-1` | Financial Q1 | `admin` |
| `report-2` | User Analytics | `manager` |
| `report-3` | System Status | `guest` |

---

## Verification Walkthrough (The Proxy Contract)

```bash
# 1. Fresh start — counter = 0
curl http://localhost:8080/api/metrics
# → { "total_instantiations": 0 }

# 2. List reports — counter stays 0 (Virtual Proxy serves metadata)
curl http://localhost:8080/api/reports
curl http://localhost:8080/api/metrics
# → { "total_instantiations": 0 }  ✅ lazy!

# 3. Generate report-3 (first time) — counter → 1
curl "http://localhost:8080/api/reports/report-3/generate?role=guest"
curl http://localhost:8080/api/metrics
# → { "total_instantiations": 1 }  ✅ lazy init happened

# 4. Generate report-3 again (cache hit) — counter stays 1
curl "http://localhost:8080/api/reports/report-3/generate?role=guest"
curl http://localhost:8080/api/metrics
# → { "total_instantiations": 1 }  ✅ cached instance reused

# 5. Unauthorized access — counter stays 1 (Protection Proxy blocked it)
curl "http://localhost:8080/api/reports/report-1/generate?role=guest"
# → 403 { "error": "Access Denied" }
curl http://localhost:8080/api/metrics
# → { "total_instantiations": 1 }  ✅ heavy object never touched

# 6. Authorized access — counter → 2
curl "http://localhost:8080/api/reports/report-1/generate?role=admin"
curl http://localhost:8080/api/metrics
# → { "total_instantiations": 2 }  ✅ Protection Proxy delegated

# 7. Metrics reset
curl -X POST http://localhost:8080/api/metrics/reset
curl http://localhost:8080/api/metrics
# → { "total_instantiations": 0 }  ✅ reset successful

# 8. 404 for unknown report
curl "http://localhost:8080/api/reports/does-not-exist/generate?role=admin"
# → 404 { "error": "Report not found" }
```

---

## Running Tests

```bash
npm test
```

All 10 core requirement groups are covered by integration tests in `tests/proxy.test.ts`.

---

## Design Pattern Notes

### Virtual Proxy (Lazy Initialization)
- `VirtualReportProxy` caches `id`, `title`, and `requiredRole` at construction.
- `getTitle()` / `getId()` / `getRequiredRole()` return cached values **immediately** — zero instantiation cost.
- `generate()` checks if `realSubject === null`. If so, it creates `HeavyReportGenerator` (which auto-increments `MetricsTracker`), then caches and reuses it for all future calls.

### Protection Proxy (Access Control)
- `ProtectionReportProxy` wraps `VirtualReportProxy` as the **outer shell**.
- `generate()` checks `userRole === requiredRole`. Mismatch → throws `AccessDeniedError` → API returns `403`.
- Authorized requests pass through to `VirtualReportProxy` for lazy evaluation.
- The protection check happens **before** the Virtual Proxy can create any heavy objects.

### MetricsTracker
- Static class with a global counter.
- `increment()` is called **only inside `HeavyReportGenerator`'s constructor**.
- This makes the counter a precise observable metric for verifying the proxy behaviour.

---

## Tools & Skills Used

### Tools
- **Node.js (v22)** — Runtime
- **TypeScript** — Strongly-typed implementation with interfaces and classes
- **Express.js** — HTTP server framework
- **Vitest** — Unit and integration test runner
- **Supertest** — HTTP assertion library for API testing
- **Docker + Docker Compose** — Containerization and zero-setup deployment
- **dotenv / cors** — Environment management and CORS support

### Skills Demonstrated
- **Object-Oriented Design** — Interface (`Report`), Real Subject, two Proxy classes
- **Design Patterns Implementation** — Virtual Proxy + Protection Proxy (Gang of Four)
- **Lazy Initialization** — `realSubject` starts `null`, created on first `generate()` call
- **Access Control** — Role-based protection layer without polluting business logic
- **API Design** — RESTful endpoints with correct HTTP status codes (200 / 403 / 404)
- **Performance Optimization** — Metadata served from cache; heavy objects deferred and reused
