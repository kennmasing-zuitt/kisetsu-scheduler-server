import { model, Schema } from 'mongoose';

/**
 * An SMS code sent to prove a mobile number (booking-site app setup). One per number; a new
 * request replaces it. MongoDB deletes it once expired (TTL index).
 */
export const MobileVerificationSchema = new Schema(
    {
        mobile: { type: String, required: true },
        /** HMAC of the code (shared/otp/oneTimeCodes.ts); the code itself is never stored */
        codeHash: { type: String, required: true },
        attempts: { type: Number, default: 0 },
        expiresAt: { type: Date, required: true },
    },
    { collection: 'MobileVerification', timestamps: true },
);
MobileVerificationSchema.index({ mobile: 1 }, { unique: true });
MobileVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const MobileVerificationModel = model('MobileVerification', MobileVerificationSchema);
