import { env } from '../../../../core/config/env.js';
import { minutesOf, zonedTimeToUtc } from '../../../../shared/time.js';
import { ScheduleImpl, ScheduleOperations } from '../../../schedule/index.js';
import type { Slot, SlotQuery } from '../../db/_booking.types.js';
import { priceFor } from './bookingOptions.js';
import { assertDayBookable, bookingWindow, SLOT_STEP_MINUTES } from './bookingWindow.js';

interface Interval {
    start: Date;
    end: Date;
}
const overlaps = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end;

/**
 * Free start times on a day for a service and length: every SLOT_STEP_MINUTES from opening,
 * at least BOOKING_MIN_LEAD_MINUTES from now, where some therapist (or the one asked for) is
 * working and free and a room is free. Therapists on a day off or leave never appear.
 */
export async function availableSlots(query: SlotQuery, now = new Date()): Promise<Slot[]> {
    const window = bookingWindow(now);
    assertDayBookable(query.date, window);
    await priceFor(query.serviceId, query.durationMin, query.date);

    const tz = env.SCHEDULE_TIMEZONE;
    const dayStart = zonedTimeToUtc(query.date, 0, tz);
    const noon = zonedTimeToUtc(query.date, 12 * 60, tz);
    const [roster, rooms, bookings] = await Promise.all([
        ScheduleImpl.readTherapists(),
        ScheduleImpl.readRooms(),
        ScheduleOperations.readBookings({
            from: dayStart,
            to: zonedTimeToUtc(query.date, 24 * 60, tz),
        }),
    ]);
    const working = roster.filter(
        (t) =>
            !ScheduleImpl.isTherapistOff(t, noon) &&
            (!query.therapistId || String(t._id) === query.therapistId),
    );
    if (!working.length || !rooms.length) return [];

    const opens = minutesOf(env.SCHEDULE_OPENING_TIME);
    const closes = minutesOf(env.SCHEDULE_CLOSING_TIME);
    const slots: Slot[] = [];
    for (let m = opens; m + query.durationMin <= closes; m += SLOT_STEP_MINUTES) {
        const slot = {
            start: zonedTimeToUtc(query.date, m, tz),
            end: zonedTimeToUtc(query.date, m + query.durationMin, tz),
        };
        if (slot.start < window.earliestStart) continue;
        const clashing = bookings.filter((b) => overlaps(b, slot));
        const roomFree = rooms.some(
            (r) => !clashing.some((b) => String(b.roomId) === String(r._id)),
        );
        if (!roomFree) continue;
        const therapistIds = working
            .filter((t) => !clashing.some((b) => String(b.therapistId) === String(t._id)))
            .map((t) => String(t._id));
        if (therapistIds.length) slots.push({ ...slot, therapistIds });
    }
    return slots;
}
