/**
 * Centralized Metrics Tracker.
 * Globally accessible instantiation counter that strictly tracks
 * how many times HeavyReportGenerator has been instantiated.
 */
export class MetricsTracker {
  public static instantiations: number = 0;

  public static increment(): void {
    this.instantiations++;
  }

  public static getCount(): number {
    return this.instantiations;
  }

  public static reset(): void {
    this.instantiations = 0;
  }
}
