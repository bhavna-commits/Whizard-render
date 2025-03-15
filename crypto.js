import crypto from "crypto";

export function generateRefreshToken() {
    const token = crypto.randomBytes(32).toString("hex"); // 32 bytes = 64 characters in hex
    const expiresAt = Date.now() + 10 * 60 * 1000; // Token expires in 2 minutes
    return { token, expiresAt };
}

console.log(crypto.randomBytes(2).toString());