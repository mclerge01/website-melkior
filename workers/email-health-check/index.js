import { sendWeeklyEmailHealthCheck } from "../../lib/email-health-check.mjs";

export default {
  /**
   * Run the weekly Cloudflare Email Service health check.
   *
   * This Worker intentionally has no fetch handler or public route.
   *
   * @param {{scheduledTime: number, cron: string}} controller - Scheduled event metadata.
   * @param {Record<string, unknown>} env - Worker environment.
   * @param {{waitUntil: Function}} ctx - Worker execution context.
   */
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(sendWeeklyEmailHealthCheck(env, controller.scheduledTime));
  },
};
