export async function register() {
  // Validate env exactly once when the Node.js server starts. Edge routes are
  // skipped: lib/env.server.ts is server-only and Next's edge bundles cannot
  // import it safely.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./lib/env.server");
    await import("./lib/env.client");
  }
}
