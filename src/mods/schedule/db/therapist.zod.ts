import { z } from 'zod';
import { ObjectIdSchema } from '../../../shared/validation.js';

/** 0 = Sunday … 6 = Saturday (same as Date#getDay) */
export const Weekday = z.number().int().min(0).max(6);

/** A calendar date "YYYY-MM-DD" that actually exists */
export const DateKey = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Use YYYY-MM-DD' })
    .refine(
        (d) => {
            // JS rolls 2030-02-30 over to March 2nd, so compare the round trip
            const date = new Date(`${d}T00:00:00Z`);
            return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(d);
        },
        { message: 'Invalid date' },
    );

// Stored de-duplicated and sorted, so the client can compare lists directly
const fields = {
    name: z.string().trim().min(1).max(100),
    offDays: z
        .array(Weekday)
        .max(7)
        .transform((days) => [...new Set(days)].sort((a, b) => a - b)),
    leaveDates: z
        .array(DateKey)
        .max(1000)
        .transform((dates) => [...new Set(dates)].sort()),
};

export const CreateTherapistInput = z.object({
    name: fields.name,
    offDays: fields.offDays.default([]),
    leaveDates: fields.leaveDates.default([]),
});

export const UpdateTherapistInput = z
    .object(fields)
    .partial()
    .refine((d) => d.name !== undefined || d.offDays !== undefined || d.leaveDates !== undefined, {
        message: 'Provide at least one field to update',
    });

export const TherapistIdArgs = z.object({ id: ObjectIdSchema });

export type CreateTherapistInput = z.infer<typeof CreateTherapistInput>;
export type UpdateTherapistInput = z.infer<typeof UpdateTherapistInput>;
