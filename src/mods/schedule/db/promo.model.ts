import { InferSchemaType, model, Schema } from 'mongoose';
import { DISCOUNT_TYPE_VALUES } from './_schedule.enum.js';

/**
 * A promo code. One per booking; the discount is computed by reports from the booking's price
 * on its date (service/impl/promoDiscount.ts), like prices are.
 *
 * Once a booking uses a promo its terms (code, discountType, value, serviceIds) are locked, so
 * past reports never change. Description, period and isActive stay editable: archive or
 * activate it any time.
 */
export const PromoSchema = new Schema(
    {
        /** Stored upper-case, e.g. "KISETSU10" */
        code: { type: String, required: true, trim: true, uppercase: true },
        description: { type: String, default: '', trim: true },
        discountType: { type: String, enum: DISCOUNT_TYPE_VALUES, required: true },
        /** Percent (1–100) or pesos, depending on discountType */
        value: { type: Number, required: true },
        /** First day it can be used, "YYYY-MM-DD" in SCHEDULE_TIMEZONE (inclusive) */
        validFrom: { type: String, required: true },
        /** Last day (inclusive); null = no end */
        validTo: { type: String, default: null },
        /** Services it applies to; empty = every service */
        serviceIds: { type: [Schema.Types.ObjectId], ref: 'Service', default: [] },
        /** Archived promos can't be applied to new bookings; used ones stay in reports */
        isActive: { type: Boolean, default: true },
    },
    {
        collection: 'Promo',
        timestamps: true,
        toJSON: { virtuals: true, versionKey: false },
    },
);

PromoSchema.index({ code: 1 }, { unique: true });

export type PromoSchemaType = InferSchemaType<typeof PromoSchema>;
export const PromoModel = model('Promo', PromoSchema);
