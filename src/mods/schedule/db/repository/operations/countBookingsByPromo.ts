import { Types } from 'mongoose';
import { BookingModel } from '../../booking.model.js';

/** How many bookings used each promo (promos never used are absent from the map) */
export const countBookingsByPromo = async (promoIds: string[]): Promise<Map<string, number>> => {
    const rows = await BookingModel.aggregate<{ _id: Types.ObjectId; n: number }>([
        { $match: { promoId: { $in: promoIds.map((id) => new Types.ObjectId(id)) } } },
        { $group: { _id: '$promoId', n: { $sum: 1 } } },
    ]);
    return new Map(rows.map((r) => [String(r._id), r.n]));
};
