export async function register() {
  // Only run cron on the server, not during build or in Edge runtime
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startCronJobs } = await import("./lib/cron");
    startCronJobs();
  }
}
