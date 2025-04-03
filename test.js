import crypto from "crypto";

export const generateUniqueId = () => {
    return crypto.randomBytes(5).toString(16)
        // .slice(0, 10);
};

console.log(generateUniqueId());