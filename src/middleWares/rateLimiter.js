const MAX_ATTEMPTS_STAGE_1 = 6; // 5 attempts, cooldown 15 mins
const MAX_ATTEMPTS_STAGE_2 = 5; // 3 attempts, cooldown 1 hour
const MAX_ATTEMPTS_STAGE_3 = 5; // 3 attempts, cooldown 1 day
const LOCK_TIME_STAGE_1 = 15 * 60 * 1000; // 15 minutes in milliseconds
const LOCK_TIME_STAGE_2 = 60 * 60 * 1000; // 1 hour in milliseconds
const LOCK_TIME_STAGE_3 = 24 * 60 * 60 * 1000; // 1 day in milliseconds
const timeout = "";

export const incrementLoginAttempts = async (user) => {
	const now = Date.now();
	if (user.lockUntil && user.lockUntil > now) {
		return; 
	}

	let updates = { $inc: { loginAttempts: 1 } };
	// Reset attempts if the user was previously locked but now is unlocked
	if (user.lockUntil && user.lockUntil < now) {
		updates = { loginAttempts: 1, lockUntil: 0 }; // Reset login attempts
	}

	// Handle different stages of rate limiting
	if (user.loginAttempts + 1 >= MAX_ATTEMPTS_STAGE_1 && !user.lockUntil) {
		updates = { loginAttempts: 1, lockUntil: now + LOCK_TIME_STAGE_1 }; // First lock (15 mins)
		timeout = "15 minutes";
	} else if (
		user.loginAttempts + 1 >= MAX_ATTEMPTS_STAGE_2 &&
		user.lockUntil < now
	) {
		updates = { loginAttempts: 1, lockUntil: now + LOCK_TIME_STAGE_2 }; // Second lock (1 hour)
		timeout = "1 hour";
	} else if (
		user.loginAttempts + 1 >= MAX_ATTEMPTS_STAGE_3 &&
		user.lockUntil < now
	) {
		updates = { loginAttempts: 1, lockUntil: now + LOCK_TIME_STAGE_3 }; // Third lock (1 day)
		timeout = "1 day";
	} else if (user.loginAttempts >= MAX_ATTEMPTS_STAGE_3) {
		updates = { loginAttempts: 0, blocked: true }; // Block user
	}

	await user.updateOne(updates); 
	return timeout;
};
