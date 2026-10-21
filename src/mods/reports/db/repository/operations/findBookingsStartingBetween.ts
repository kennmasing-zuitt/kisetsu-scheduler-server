import { ACTIVE_BOOKING, BookingModel } from '../../../../schedule/index.js';
import type { BookingWindow, ReportBooking } from '../../_reports.types.js';

/**
 * Active (not cancelled) bookings that start in [from, to), earliest first, with only the fields a report needs.
 * Reports own no collection: they read the schedule's bookings.
 */
export const findBookingsStartingBetween = async ({
    from,
    to,
    endedBy,
}: BookingWindow): Promise<ReportBooking[]> =>
    BookingModel.find({
        ...ACTIVE_BOOKING,
        start: { $gte: from, $lt: to },
        ...(endedBy ? { end: { $lte: endedBy } } : {}),
    })
        .select({
            client: 1,
            clientId: 1,
            clientMobile: 1,
            therapistId: 1,
            serviceId: 1,
            isRequested: 1,
            promoId: 1,
            source: 1,
            start: 1,
            end: 1,
        })
        .sort({ start: 1, _id: 1 })
        .lean<ReportBooking[]>();
