import { Report } from "../core/Report";
import { HeavyReportGenerator } from "../core/HeavyReportGenerator";

/**
 * Virtual Proxy.
 * Implements lazy initialization for HeavyReportGenerator.
 * Holds cached metadata (id, title, role) and defers the expensive instantiation
 * until generate() is explicitly called.
 */
export class VirtualReportProxy implements Report {
  private id: string;
  private title: string;
  private requiredRole: string;
  private realSubject: Report | null = null;
  private isInitializing: boolean = false;

  constructor(id: string, title: string, requiredRole: string = "") {
    this.id = id;
    this.title = title;
    this.requiredRole = requiredRole;
    this.realSubject = null; // Crucial: Starts as null
  }

  getId(): string {
    return this.id;
  }

  getTitle(): string {
    // Returns cached title immediately.
    // DOES NOT instantiate the real subject.
    return this.title;
  }

  getRequiredRole(): string {
    return this.requiredRole;
  }

  isInstantiated(): boolean {
    return this.realSubject !== null;
  }

  resetSubject(): void {
    this.realSubject = null;
  }

  generate(userRole: string): string {
    // Lazy Initialization:
    // 1. Check if realSubject is null
    // 2. If null, instantiate HeavyReportGenerator
    // 3. Delegate generate() call to realSubject
    if (!this.realSubject) {
      if (this.isInitializing) {
        // Safe guard against recursive or concurrent re-entry
        while (!this.realSubject) {
          // In event-loop synchronous code, this branch will only be hit if re-entrant
        }
      } else {
        this.isInitializing = true;
        try {
          this.realSubject = new HeavyReportGenerator(
            this.id,
            this.title,
            this.requiredRole
          );
        } finally {
          this.isInitializing = false;
        }
      }
    }
    return this.realSubject.generate(userRole);
  }
}
