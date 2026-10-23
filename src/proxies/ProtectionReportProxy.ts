import { Report } from "../core/Report";

/**
 * Custom error thrown when a user lacks required permissions.
 */
export class AccessDeniedError extends Error {
  constructor(message: string = "Access Denied") {
    super(message);
    this.name = "AccessDeniedError";
    Object.setPrototypeOf(this, AccessDeniedError.prototype);
  }
}

/**
 * Protection Proxy.
 * Enforces access control before delegating to the underlying Report.
 * Wraps the Virtual Proxy to protect it from triggering lazy instantiation
 * when unauthorized requests arrive.
 */
export class ProtectionReportProxy implements Report {
  private underlyingReport: Report;
  private requiredRole: string;

  constructor(underlyingReport: Report, requiredRole: string) {
    this.underlyingReport = underlyingReport;
    this.requiredRole = requiredRole;
  }

  getId(): string {
    return this.underlyingReport.getId();
  }

  getTitle(): string {
    // Metadata is public, delegate immediately
    return this.underlyingReport.getTitle();
  }

  getRequiredRole(): string {
    return this.requiredRole;
  }

  getUnderlyingReport(): Report {
    return this.underlyingReport;
  }

  generate(userRole: string): string {
    // Role matching: The role query param must match the required_role of the report
    if (!userRole || userRole !== this.requiredRole) {
      throw new AccessDeniedError("Access Denied");
    }

    return this.underlyingReport.generate(userRole);
  }
}
