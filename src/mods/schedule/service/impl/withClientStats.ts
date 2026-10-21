import type { Client, ClientStats, ClientWithStats } from '../../db/_schedule.types.js';
import * as ScheduleOperations from '../../db/repository/index.js';

const NO_STATS: ClientStats = {
    visits: 0,
    upcoming: 0,
    firstBooking: null,
    firstVisit: null,
    lastVisit: null,
    requested: 0,
    favouriteTherapistId: null,
    favouriteTherapistName: null,
};

/** Adds visit counts (from bookings) to clients, with two aggregations for the whole list. */
export async function withClientStats(
    clients: Client[],
    now = new Date(),
): Promise<ClientWithStats[]> {
    if (clients.length === 0) return [];
    const [stats, therapists] = await Promise.all([
        ScheduleOperations.clientBookingStats(
            clients.map((c) => String(c._id)),
            now,
        ),
        ScheduleOperations.readTherapists(),
    ]);
    const therapistName = new Map(therapists.map((t) => [String(t._id), t.name]));
    return clients.map((c) => {
        const row = stats.get(String(c._id));
        return {
            ...c,
            stats: row
                ? {
                      ...row,
                      favouriteTherapistName: row.favouriteTherapistId
                          ? (therapistName.get(row.favouriteTherapistId) ?? 'Removed therapist')
                          : null,
                  }
                : NO_STATS,
        };
    });
}
