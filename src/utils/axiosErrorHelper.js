// utils/axiosErrorHelper.js

/**
 * Parses known Axios/network errors and returns a structured object
 * @param {Error} err
 * @returns {{ type: string, message: string }}
 */
export function parseAxiosError(err) {
	if (!err || typeof err !== "object") {
		return { type: "UnknownError", message: "An unknown error occurred." };
	}

	// Handle Axios timeout
	if (err.code === "ETIMEDOUT") {
		return { type: "TimeoutError", message: "Connection timed out." };
	}

	// Handle network unreachable
	if (err.code === "ENETUNREACH") {
		return { type: "NetworkError", message: "Network unreachable." };
	}

	// Axios HTTP response errors
	if (err.response) {
		const { status, data } = err.response;
		return {
			type: "HttpError",
			message: `HTTP ${status}: ${
				data?.error?.message || JSON.stringify(data)
			}`,
		};
	}

	// AggregateError (node 16+)
	if (err instanceof AggregateError && Array.isArray(err.errors)) {
		const first = err.errors[0];
		return parseAxiosError(first);
	}

	// Fallback
	return { type: "UnknownError", message: err.message || String(err) };
}
