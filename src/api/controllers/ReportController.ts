import { Request, Response } from "express";
import { Report } from "../../core/Report";
import { VirtualReportProxy } from "../../proxies/VirtualReportProxy";
import { ProtectionReportProxy, AccessDeniedError } from "../../proxies/ProtectionReportProxy";

/**
 * In-memory repository of seeded reports.
 * Reports are wrapped in Protection Proxy -> Virtual Proxy -> Heavy Subject.
 */
export class ReportController {
  private static reports: Map<string, Report> = new Map();

  /**
   * Seed the system with the 3 mandatory reports at startup.
   */
  public static seedReports(): void {
    this.reports.clear();

    // 1. report-1 : Title "Financial Q1", Requires role: admin
    const rep1Virtual = new VirtualReportProxy("report-1", "Financial Q1", "admin");
    const rep1Protected = new ProtectionReportProxy(rep1Virtual, "admin");
    this.reports.set("report-1", rep1Protected);

    // 2. report-2 : Title "User Analytics", Requires role: manager
    const rep2Virtual = new VirtualReportProxy("report-2", "User Analytics", "manager");
    const rep2Protected = new ProtectionReportProxy(rep2Virtual, "manager");
    this.reports.set("report-2", rep2Protected);

    // 3. report-3 : Title "System Status", Requires role: guest
    const rep3Virtual = new VirtualReportProxy("report-3", "System Status", "guest");
    const rep3Protected = new ProtectionReportProxy(rep3Virtual, "guest");
    this.reports.set("report-3", rep3Protected);
  }

  /**
   * GET /api/reports
   * Returns list of available reports without triggering heavy object instantiation.
   */
  public static listReports(req: Request, res: Response): void {
    const reportList = Array.from(ReportController.reports.values()).map((report) => ({
      id: report.getId(),
      title: report.getTitle(),
      required_role: report.getRequiredRole()
    }));

    res.status(200).json(reportList);
  }

  /**
   * GET /api/reports/:id
   * Optional helper to fetch metadata for a single report.
   */
  public static getReportById(req: Request, res: Response): void {
    const id = req.params["id"] as string;
    const report = ReportController.reports.get(id);

    if (!report) {
      res.status(404).json({ error: "Report not found" });
      return;
    }

    res.status(200).json({
      id: report.getId(),
      title: report.getTitle(),
      required_role: report.getRequiredRole()
    });
  }

  /**
   * GET /api/reports/:id/generate?role=<user_role>
   * Generates a report with role verification and lazy instantiation.
   */
  public static generateReport(req: Request, res: Response): void {
    const id = req.params["id"] as string;
    const role = (req.query.role as string) ?? "";

    const report = ReportController.reports.get(id);
    if (!report) {
      res.status(404).json({ error: "Report not found" });
      return;
    }

    try {
      // The protection proxy intercepts this call.
      // If unauthorized, throws AccessDeniedError immediately.
      // If authorized, passes to VirtualReportProxy which lazily loads HeavyReportGenerator.
      const content = report.generate(role);

      res.status(200).json({
        id: report.getId(),
        content: content
      });
    } catch (err) {
      if (err instanceof AccessDeniedError) {
        res.status(403).json({ error: "Access Denied" });
        return;
      }
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  /**
   * Helper to retrieve reports map for testing.
   */
  public static getReportsMap(): Map<string, Report> {
    return this.reports;
  }
}
