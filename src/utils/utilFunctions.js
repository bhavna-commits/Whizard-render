export function convertUTCToLocal(timestamp) {
	if (!timestamp) return null;
	const date = new Date(timestamp);
	const localTimestamp =
		date.getTime() + date.getTimezoneOffset() * 60 * 1000;
	return localTimestamp;
}

export const oneDayInMilliSeconds = 86400000;

export const convertPlansToCurrency = async (
	basePlans,
	targetCurrency = "INR",
) => {
	let rate = 1;

	if (targetCurrency !== "INR") {
		try {
			const resp = await fetch(
				`https://api.exchangerate-api.com/v4/latest/INR`,
			);
			const data = await resp.json();
			rate = data.rates[targetCurrency] || 1;
		} catch (err) {
			console.error(
				"Exchange rate fetch failed. Falling back to 1:",
				err,
			);
		}
	}

	const convertedPlans = {};
	for (const key in basePlans) {
		const baseAmount = basePlans[key].amount;
		convertedPlans[key] = {
			currency: targetCurrency,
			amount: +(baseAmount * rate).toFixed(2),
		};
	}

	return convertedPlans;
};
