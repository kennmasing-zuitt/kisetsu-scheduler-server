import { z } from 'zod';
import { ObjectIdSchema } from '../../../shared/validation.js';

/** Longest booking allowed, in minutes */
export const MAX_BOOKING_MINUTES = 600;
/** Widest window `bookings(from, to)` returns, in days (a month view plus padding) */
export const MAX_RANGE_DAYS = 62;

// DateTime arguments arrive as Date objects (see shared/graphql/scalars.ts)
const fields = {
    client: z.string().trim().min(1).max(200),
    therapistId: ObjectIdSchema,
    roomId: ObjectIdSchema,
    start: z.date(),
    end: z.date(),
};

// "end after start", opening hours, days off and overlaps are checked by the service,
// on the merged values for updates (see service/impl/assertBookingAllowed.ts)
export const CreateBookingInput = z.object(fields);

export const UpdateBookingInput = z
    .object(fields)
    .partial()
    .refine((d) => Object.values(d).some((v) => v !== undefined), {
        message: 'Provide at least one field to update',
    });

export const BookingIdArgs = z.object({ id: ObjectIdSchema });

const emptyToUndefined = (v: unknown) => (v === '' || v === null ? undefined : v);

export const BookingRangeArgs = z
    .object({
        from: z.date(),
        to: z.date(),
        therapistId: z.preprocess(emptyToUndefined, ObjectIdSchema.optional()),
        roomId: z.preprocess(emptyToUndefined, ObjectIdSchema.optional()),
    })
    .refine((d) => d.to > d.from, { message: '`to` must be after `from`', path: ['to'] })
    .refine((d) => d.to.getTime() - d.from.getTime() <= MAX_RANGE_DAYS * 86_400_000, {
        message: `The range can span at most ${MAX_RANGE_DAYS} days`,
        path: ['to'],
    });

export type CreateBookingInput = z.infer<typeof CreateBookingInput>;
export type UpdateBookingInput = z.infer<typeof UpdateBookingInput>;
export type BookingRangeArgs = z.infer<typeof BookingRangeArgs>;
