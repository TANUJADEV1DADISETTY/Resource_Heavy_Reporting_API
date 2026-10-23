import { Report } from "./Report";
import { MetricsTracker } from "./MetricsTracker";

/**
 * The Real Subject.
 * Simulates a resource-heavy reporting generator.
 * Instantiation is expensive, so it logs to MetricsTracker every time
 * the constructor is called.
 */
export class HeavyReportGenerator implements Report {
  private id: string;
  private title: string;
  private requiredRole: string;

  constructor(id: string, title: string, requiredRole: string = "") {
    this.id = id;
    this.title = title;
    this.requiredRole = requiredRole;
    // Track instantiation strictly in the constructor
    MetricsTracker.increment();
  }

  getId(): string {
    return this.id;
  }

  getTitle(): string {
    return this.title;
  }

  getRequiredRole(): string {
    return this.requiredRole;
  }

  generate(userRole: string): string {
    return `Report content for ${this.title}`;
  }
}
