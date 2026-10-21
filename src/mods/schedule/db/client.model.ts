import { InferSchemaType, model, Schema } from 'mongoose';

/**
 * A spa client, identified by mobile number. Created automatically the first time a booking
 * uses a number that isn't on file (see service/impl/findOrCreateClient.ts). Visit counts are
 * not stored: they're counted from bookings, so they're always right.
 */
export const ClientSchema = new Schema(
    {
        /** Canonical E.164 form, e.g. "+639171234567" (see shared/mobile.ts) */
        mobile: { type: String, required: true, trim: true },
        firstName: { type: String, required: true, trim: true },
        lastName: { type: String, default: '', trim: true },
        /** Free notes for the front desk (preferences, pressure, …) */
        notes: { type: String, default: '', trim: true },
        /**
         * Sign-in for the public booking site with an authenticator app (no password). Set up by
         * the client after proving the number by SMS. Secrets are sealed (TOTP_ENCRYPTION_KEY).
         */
        app: {
            type: new Schema(
                {
                    secret: { type: String, default: null, select: false },
                    pendingSecret: { type: String, default: null, select: false },
                    lastStep: { type: Number, default: null },
                    failedAttempts: { type: Number, default: 0 },
                    lockedUntil: { type: Date, default: null },
                    enabledAt: { type: Date, default: null },
                    // Bumped by a reset: booking-site sessions signed before stop working
                    version: { type: Number, default: 0 },
                },
                { _id: false },
            ),
            default: () => ({}),
        },
    },
    {
        collection: 'Client',
        timestamps: true,
        toJSON: { virtuals: true, versionKey: false },
    },
);

ClientSchema.index({ mobile: 1 }, { unique: true });
ClientSchema.index({ firstName: 1, lastName: 1 });

export type ClientSchemaType = InferSchemaType<typeof ClientSchema>;
export const ClientModel = model('Client', ClientSchema);
