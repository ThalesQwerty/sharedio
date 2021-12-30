import crypto from 'crypto';

export function RandomHex(length = 32) {
    return crypto.randomBytes(length / 2).toString("hex");
}