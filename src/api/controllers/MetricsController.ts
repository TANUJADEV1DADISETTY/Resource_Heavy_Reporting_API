import { Request, Response } from "express";
import { MetricsTracker } from "../../core/MetricsTracker";

export class MetricsController {
  /**
   * GET /api/metrics
   * Returns current total instantiations count.
   */
  public static getMetrics(req: Request, res: Response): void {
    res.status(200).json({
      total_instantiations: MetricsTracker.getCount()
    });
  }

  /**
   * POST /api/metrics/reset
   * Resets the global metrics tracker counter.
   */
  public static resetMetrics(req: Request, res: Response): void {
    MetricsTracker.reset();
    res.status(200).json({
      message: "Metrics reset successfully"
    });
  }
}
