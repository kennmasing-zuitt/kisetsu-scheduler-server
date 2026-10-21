import { Types } from 'mongoose';
import { ACTIVE_BOOKING } from '../../_schedule.enum.js';
import { BookingModel } from '../../booking.model.js';

export interface ClientBookingStatsRow {
    visits: number;
    upcoming: number;
    firstBooking: Date | null;
    firstVisit: Date | null;
    lastVisit: Date | null;
    requested: number;
    favouriteTherapistId: string | null;
}

/**
 * Per-client counts from active (not cancelled) bookings, for many clients in two aggregations. A visit is a booking
 * that ended by `now`; `requested` counts visits where the therapist was asked for by name.
 */
export const clientBookingStats = async (
    clientIds: string[],
    now: Date,
): Promise<Map<string, ClientBookingStatsRow>> => {
    const ids = clientIds.map((id) => new Types.ObjectId(id));
    const ended = { $lte: ['$end', now] };
    const [rows, therapists] = await Promise.all([
        BookingModel.aggregate<{
            _id: Types.ObjectId;
            visits: number;
            upcoming: number;
            firstBooking: Date | null;
            firstVisit: Date | null;
            lastVisit: Date | null;
            requested: number;
        }>([
            { $match: { clientId: { $in: ids }, ...ACTIVE_BOOKING } },
            {
                $group: {
                    _id: '$clientId',
                    visits: { $sum: { $cond: [ended, 1, 0] } },
                    upcoming: { $sum: { $cond: [ended, 0, 1] } },
                    firstBooking: { $min: '$start' },
                    // $min / $max skip nulls, so only ended bookings count here
                    firstVisit: { $min: { $cond: [ended, '$start', null] } },
                    lastVisit: { $max: { $cond: [ended, '$start', null] } },
                    requested: {
                        $sum: { $cond: [{ $and: [ended, { $eq: ['$isRequested', true] }] }, 1, 0] },
                    },
                },
            },
        ]),
        // Visits per (client, therapist), most first: the first row per client is the favourite
        BookingModel.aggregate<{ _id: { client: Types.ObjectId; therapist: Types.ObjectId } }>([
            { $match: { clientId: { $in: ids }, end: { $lte: now }, ...ACTIVE_BOOKING } },
            {
                $group: {
                    _id: { client: '$clientId', therapist: '$therapistId' },
                    n: { $sum: 1 },
                    last: { $max: '$start' },
                },
            },
            { $sort: { n: -1, last: -1 } },
        ]),
    ]);

    const favourite = new Map<string, string>();
    for (const t of therapists) {
        const client = String(t._id.client);
        if (!favourite.has(client)) favourite.set(client, String(t._id.therapist));
    }

    return new Map(
        rows.map((r) => [
            String(r._id),
            {
                visits: r.visits,
                upcoming: r.upcoming,
                firstBooking: r.firstBooking,
                firstVisit: r.firstVisit,
                lastVisit: r.lastVisit,
                requested: r.requested,
                favouriteTherapistId: favourite.get(String(r._id)) ?? null,
            },
        ]),
    );
};
