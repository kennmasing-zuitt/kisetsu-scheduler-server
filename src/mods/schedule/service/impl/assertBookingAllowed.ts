import { env } from '../../../../core/config/env.js';
import {
    ConflictError,
    NotFoundError,
    ValidationError,
} from '../../../../shared/errors/AppError.js';
import { minutesOf, zonedParts } from '../../../../shared/time.js';
import type { BookingSlot } from '../../db/_schedule.types.js';
import { MAX_BOOKING_MINUTES } from '../../db/booking.zod.js';
import * as ScheduleOperations from '../../db/repository/index.js';
import { findRoomById } from './findRoomById.js';
import { findServiceById } from './findServiceById.js';
import { findServicePrice, pricedDurationsOn } from './findServicePrice.js';
import { findTherapistById } from './findTherapistById.js';

/**
 * The scheduling rules, enforced for every create and update (the client checks the same rules
 * for instant feedback, but this is the source of truth):
 *   - ends after it starts, and lasts at most MAX_BOOKING_MINUTES
 *   - the therapist and room exist
 *   - fits inside opening hours on a single day (SCHEDULE_TIMEZONE)
 *   - the therapist isn't on a weekly day off or on leave that day
 *   - neither the therapist nor the room has another booking overlapping it
 *   - the service exists, is offered (unless `allowArchivedService`) and has a price for this
 *     length on this date (e.g. Fuyu: 60 or 80 minutes)
 *
 * `ignoreBookingId` is the booking being edited, so it doesn't clash with itself.
 * `allowArchivedService` lets an existing booking keep an archived service when it's moved.
 */
export async function assertBookingAllowed(
    slot: BookingSlot,
    ignoreBookingId?: string,
    { allowArchivedService = false }: { allowArchivedService?: boolean } = {},
): Promise<void> {
    const { therapistId, roomId, start, end, serviceId } = slot;

    const durationMin = (end.getTime() - start.getTime()) / 60_000;
    if (durationMin <= 0) throw new ValidationError('A booking must end after it starts');
    if (durationMin > MAX_BOOKING_MINUTES) {
        throw new ValidationError(`A booking can't be longer than ${MAX_BOOKING_MINUTES} minutes`);
    }

    const [therapist, room] = await Promise.all([
        findTherapistById(therapistId),
        findRoomById(roomId),
    ]);
    if (!therapist) throw new NotFoundError('Therapist not found');
    if (!room) throw new NotFoundError('Room not found');

    const tz = env.SCHEDULE_TIMEZONE;
    const local = zonedParts(start, tz);
    const lastMinute = zonedParts(new Date(end.getTime() - 1), tz);
    const opens = env.SCHEDULE_OPENING_TIME;
    const closes = env.SCHEDULE_CLOSING_TIME;
    if (
        local.dateKey !== lastMinute.dateKey ||
        local.minutes < minutesOf(opens) ||
        local.minutes + durationMin > minutesOf(closes)
    ) {
        throw new ValidationError(`Bookings must fit between ${opens} and ${closes} on one day`);
    }

    if (serviceId) {
        const service = await findServiceById(serviceId);
        if (!service) throw new NotFoundError('Service not found');
        if (!service.isActive && !allowArchivedService) {
            throw new ValidationError(`${service.name} is no longer offered`);
        }
        const day = { dateKey: local.dateKey, weekday: local.weekday };
        if (!findServicePrice(service.prices, { ...day, durationMin })) {
            const lengths = pricedDurationsOn(service.prices, day);
            throw new ValidationError(
                `${service.name} has no price for ${durationMin} minutes on ${local.dateKey}` +
                    (lengths.length ? ` (available: ${lengths.join(', ')} minutes)` : ''),
                { lengths },
            );
        }
    }

    if (therapist.offDays.includes(local.weekday) || therapist.leaveDates.includes(local.dateKey)) {
        throw new ConflictError(`${therapist.name} is off on that day`, 'THERAPIST_UNAVAILABLE');
    }

    const overlap = { start, end, excludeId: ignoreBookingId };
    const [therapistClash, roomClash] = await Promise.all([
        ScheduleOperations.findOverlappingBooking({ ...overlap, therapistId }),
        ScheduleOperations.findOverlappingBooking({ ...overlap, roomId }),
    ]);
    if (therapistClash) {
        throw new ConflictError(
            `${therapist.name} already has a booking at that time`,
            'THERAPIST_DOUBLE_BOOKED',
            { bookingId: String(therapistClash._id) },
        );
    }
    if (roomClash) {
        throw new ConflictError(`${room.name} is already booked at that time`, 'ROOM_TAKEN', {
            bookingId: String(roomClash._id),
        });
    }
}
