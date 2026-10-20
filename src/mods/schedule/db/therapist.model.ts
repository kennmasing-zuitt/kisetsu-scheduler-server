import { InferSchemaType, model, Schema } from 'mongoose';

export const TherapistSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        /** Recurring weekly days off: 0 = Sunday … 6 = Saturday */
        offDays: { type: [Number], default: [] },
        /** One-off leave, as local dates "YYYY-MM-DD" (in SCHEDULE_TIMEZONE) */
        leaveDates: { type: [String], default: [] },
    },
    {
        collection: 'Therapist',
        timestamps: true,
        toJSON: { virtuals: true, versionKey: false },
    },
);

export type TherapistSchemaType = InferSchemaType<typeof TherapistSchema>;
export const TherapistModel = model('Therapist', TherapistSchema);
