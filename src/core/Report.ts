/**
 * The Subject Interface.
 * Both proxies and the real implementation implement this common interface,
 * allowing the client to remain oblivious to whether it interacts with
 * a proxy or the real subject.
 */
export interface Report {
  getId(): string;
  getTitle(): string;
  getRequiredRole(): string;
  generate(userRole: string): string;
}
