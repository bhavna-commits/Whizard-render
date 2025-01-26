export function convertUTCToLocal(timestamp) {
	if (!timestamp) return null;
	const date = new Date(timestamp);
	const localTimestamp =
		date.getTime() + date.getTimezoneOffset() * 60 * 1000;
	return localTimestamp;
}
export const oneDayInMilliSeconds = 86400000;
