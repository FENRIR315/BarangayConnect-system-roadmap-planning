export async function register() {
  // Only on the long-running Node server (not during static builds / pages build).
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXT_PHASE !== "phase-production-build") {
    const { sendPendingEmails } = await import("@/lib/mail");
    setInterval(() => {
      void sendPendingEmails({ limit: 25 }).catch(() => {});
    }, 30_000);
  }
}