import { BookingModel, BookingStatus, CancelReason } from '../../../../schedule/index.js';
import type { BookingWindow, CancellationSummary } from '../../_reports.types.js';

/** Cancelled bookings that were due to start in [from, to), by reason. */
export const countCancellations = async ({
    from,
    to,
}: BookingWindow): Promise<CancellationSummary> => {
    const rows = await BookingModel.aggregate<{ _id: string | null; n: number }>([
        { $match: { status: BookingStatus.cancelled, start: { $gte: from, $lt: to } } },
        { $group: { _id: '$cancelReason', n: { $sum: 1 } } },
    ]);
    const by = new Map(rows.map((r) => [r._id, r.n]));
    const byStaff = by.get(CancelReason.staff) ?? 0;
    const therapistUnavailable = by.get(CancelReason.therapistUnavailable) ?? 0;
    return { total: rows.reduce((sum, r) => sum + r.n, 0), byStaff, therapistUnavailable };
};
