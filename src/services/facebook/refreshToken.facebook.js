import User from "../../models/user.model.js";
import cron from "node-cron";

export async function refreshBusinessToken(userId, wabaId, oldToken) {
	await withRetry(async () => {
		const refreshUrl =
			`https://graph.facebook.com/${process.env.FB_GRAPH_VERSION}/oauth/access_token` +
			`?grant_type=fb_exchange_token` +
			`&client_id=${process.env.FB_APP_ID}` +
			`&client_secret=${process.env.FB_APP_SECRET}` +
			`&fb_exchange_token=${oldToken}`;

		const resp = await fetch(refreshUrl);
		const data = await resp.json();
		if (data.error) throw new Error(data.error.message);

		await User.findOneAndUpdate(
			{ unique_id: userId },
			{
				FB_ACCESS_TOKEN: data.access_token,
				FB_ACCESS_EXPIRES_IN: data.expires_in,
				nextRefreshAt: new Date(
					Date.now() + (data.expires_in - 86400) * 1000,
				), // refresh 1 day early
			},
		);

		console.log(`Refreshed token for WABA ${wabaId}`);
	}).catch((err) => {
		console.error(`Token refresh failed for user ${userId}:`, err.message);
		// e.g., sendSlackAlert(`FB token refresh failed: ${err.message}`);
	});
}

// services/retry.js
export async function withRetry(fn, retries = 5, delayMs = 1000) {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;
    await new Promise(r => setTimeout(r, delayMs));
    return withRetry(fn, retries - 1, delayMs * 2);
  }
}



/**
 * Schedule a one‑off job at a given Date.
 * @param {Date} runAt    When to fire the job
 * @param {Function} job  The function to run
 * @param {string} tz     Timezone (e.g. 'UTC')
 */
export function scheduleRefresh(runAt, job, tz = "UTC") {
	const minute = runAt.getUTCMinutes();
	const hour = runAt.getUTCHours();
	const day = runAt.getUTCDate();
	const month = runAt.getUTCMonth() + 1; // cron months are 1–12

	// e.g. '30 14 5 6 *' runs at 14:30 UTC on June 5th
	const cronExpr = `${minute} ${hour} ${day} ${month} *`;

	return cron.schedule(cronExpr, job, {
		scheduled: true,
		timezone: tz,
	});
}

