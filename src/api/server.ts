import express, { Application, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { ReportController } from "./controllers/ReportController";
import { MetricsController } from "./controllers/MetricsController";
import path from "path";

dotenv.config();

export const app: Application = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Seed initial reports on startup
ReportController.seedReports();

// Health check endpoint required by docker-compose specification
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// Reporting API Endpoints
app.get("/api/reports", ReportController.listReports);
app.get("/api/reports/:id", ReportController.getReportById);
app.get("/api/reports/:id/generate", ReportController.generateReport);

// Metrics API Endpoints
app.get("/api/metrics", MetricsController.getMetrics);
app.post("/api/metrics/reset", MetricsController.resetMetrics);

// Interactive Browser Dashboard for visual verification & documentation
app.get("/", (req: Request, res: Response) => {
  res.status(200).send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resource-Heavy Reporting API | Proxy Pattern</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --accent: #38bdf8;
      --accent-hover: #0284c7;
      --success: #10b981;
      --error: #ef4444;
      --border: #334155;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 2rem;
    }
    .container {
      max-width: 960px;
      margin: 0 auto;
    }
    header {
      margin-bottom: 2rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 1.5rem;
    }
    h1 {
      margin: 0 0 0.5rem 0;
      font-size: 2rem;
      color: var(--accent);
    }
    p {
      color: var(--text-muted);
      line-height: 1.6;
      margin: 0.5rem 0;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.5rem;
    }
    .metric-val {
      font-size: 3rem;
      font-weight: 700;
      color: var(--success);
      margin: 0.5rem 0;
    }
    button {
      background: var(--accent);
      color: #0f172a;
      font-weight: 600;
      border: none;
      padding: 0.6rem 1.2rem;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.2s;
      margin-right: 0.5rem;
      margin-bottom: 0.5rem;
    }
    button:hover {
      background: var(--accent-hover);
      color: white;
    }
    button.btn-danger {
      background: var(--error);
      color: white;
    }
    button.btn-outline {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text);
    }
    button.btn-outline:hover {
      background: var(--border);
    }
    pre {
      background: #020617;
      padding: 1rem;
      border-radius: 6px;
      border: 1px solid var(--border);
      overflow-x: auto;
      font-family: monospace;
      color: #e2e8f0;
      font-size: 0.9rem;
    }
    .tag {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      background: var(--border);
    }
    .tag-admin { background: #7c3aed; color: white; }
    .tag-manager { background: #0284c7; color: white; }
    .tag-guest { background: #059669; color: white; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Resource-Heavy Reporting API</h1>
      <p>Demonstrating the <strong>Virtual Proxy</strong> (Lazy Initialization) and <strong>Protection Proxy</strong> (Access Control) design patterns.</p>
    </header>

    <div class="grid">
      <div class="card">
        <h3>Instantiation Counter</h3>
        <p>Total real HeavyReportGenerator objects created:</p>
        <div class="metric-val" id="metric-counter">0</div>
        <button class="btn-outline" onclick="fetchMetrics()">Refresh Metric</button>
        <button class="btn-danger" onclick="resetMetrics()">Reset Counter</button>
      </div>

      <div class="card">
        <h3>Architecture In Action</h3>
        <p><strong>Protection Proxy:</strong> Rejects unauthorized user roles with <code>403 Forbidden</code> before hitting the virtual proxy.</p>
        <p><strong>Virtual Proxy:</strong> Holds cached metadata and delays construction until <code>generate()</code> is invoked.</p>
      </div>
    </div>

    <div class="card" style="margin-bottom: 2rem;">
      <h3>Interactive Verification Suite</h3>
      <p>Click any test to execute the HTTP request and inspect results live:</p>
      <div>
        <button onclick="runTest('/api/reports')">1. List Reports (Metadata Only)</button>
        <button onclick="runTest('/api/reports/report-3/generate?role=guest')">2. Gen report-3 (role=guest, Lazy Init)</button>
        <button onclick="runTest('/api/reports/report-3/generate?role=guest')">3. Re-gen report-3 (Cache Hit)</button>
        <button onclick="runTest('/api/reports/report-1/generate?role=guest')">4. Gen report-1 (role=guest, Expect 403)</button>
        <button onclick="runTest('/api/reports/report-1/generate?role=admin')">5. Gen report-1 (role=admin, Authorized)</button>
        <button onclick="runTest('/api/reports/non-existent-report/generate?role=admin')">6. Non-Existent Report (Expect 404)</button>
        <button onclick="runTest('/health')">7. Health Check (/health)</button>
      </div>
    </div>

    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3>Response Output</h3>
        <span id="response-status" class="tag">-</span>
      </div>
      <pre id="response-output">// Click a button above to execute an API call...</pre>
    </div>
  </div>

  <script>
    async function fetchMetrics() {
      try {
        const res = await fetch('/api/metrics');
        const data = await res.json();
        document.getElementById('metric-counter').innerText = data.total_instantiations;
      } catch (e) {
        console.error(e);
      }
    }

    async function resetMetrics() {
      try {
        const res = await fetch('/api/metrics/reset', { method: 'POST' });
        const data = await res.json();
        document.getElementById('response-status').innerText = res.status + ' ' + res.statusText;
        document.getElementById('response-output').innerText = JSON.stringify(data, null, 2);
        fetchMetrics();
      } catch (e) {
        console.error(e);
      }
    }

    async function runTest(url) {
      try {
        const res = await fetch(url);
        const statusEl = document.getElementById('response-status');
        statusEl.innerText = res.status + ' ' + res.statusText;
        statusEl.style.background = res.ok ? 'var(--success)' : (res.status === 403 ? 'var(--error)' : 'var(--border)');
        statusEl.style.color = 'white';
        const data = await res.json();
        document.getElementById('response-output').innerText = JSON.stringify(data, null, 2);
        fetchMetrics();
      } catch (e) {
        document.getElementById('response-output').innerText = e.message;
      }
    }

    // Initial load
    fetchMetrics();
  </script>
</body>
</html>
  `);
});

let server: any = null;

if (process.env.NODE_ENV !== "test") {
  server = app.listen(PORT, () => {
    console.log(`[Reporting API] Server running on port ${PORT}`);
    console.log(`[Reporting API] Health check at http://localhost:${PORT}/health`);
    console.log(`[Reporting API] Available reports at http://localhost:${PORT}/api/reports`);
  });
}

export { server };
