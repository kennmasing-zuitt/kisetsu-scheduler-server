import { InferSchemaType, model, Schema } from 'mongoose';

/**
 * One price rule of a service. A booking is priced by the rule that matches its local date
 * (between validFrom and validTo), its weekday and its length. Rules of one service never
 * overlap (see db/service.zod.ts), so at most one matches.
 *
 * To change a price: end the current rule (validTo = the last day of the old price) and add a
 * rule starting the next day. Reports for past dates keep using the old rule.
 */
export const ServicePriceSchema = new Schema({
    /** Minutes this price is for (60, 80, ...); null = any length */
    durationMin: { type: Number, default: null },
    /** Weekdays it applies to, 0 = Sunday … 6 = Saturday; empty = every day */
    days: { type: [Number], default: [] },
    /** Price in PHP */
    amount: { type: Number, required: true },
    /** First day of the price period, "YYYY-MM-DD" in SCHEDULE_TIMEZONE (inclusive) */
    validFrom: { type: String, required: true },
    /** Last day of the price period (inclusive); null = still the current price */
    validTo: { type: String, default: null },
});

export const ServiceSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        description: { type: String, default: '', trim: true },
        /** Inactive (archived) services can't be picked for new bookings but stay in reports */
        isActive: { type: Boolean, default: true },
        prices: { type: [ServicePriceSchema], default: [] },
    },
    {
        collection: 'Service',
        timestamps: true,
        toJSON: { virtuals: true, versionKey: false },
    },
);

// One service per name, ignoring case ("Fuyu" and "FUYU" clash)
ServiceSchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

export type ServiceSchemaType = InferSchemaType<typeof ServiceSchema>;
export const ServiceModel = model('Service', ServiceSchema);
