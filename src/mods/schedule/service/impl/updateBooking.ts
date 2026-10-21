import { NotFoundError } from '../../../../shared/errors/AppError.js';
import type { Booking, BookingRecordPatch, UpdateBookingData } from '../../db/_schedule.types.js';
import * as ScheduleOperations from '../../db/repository/index.js';
import { assertBookingAllowed } from './assertBookingAllowed.js';
import { assertPromoApplies, resolvePromo } from './assertPromoApplies.js';
import { clientFullName } from './clientName.js';
import { findOrCreateClient } from './findOrCreateClient.js';

/**
 * Edit, move or reassign a booking. Only sent fields change. `promoCode: ""` removes the
 * promo; a new `clientMobile` re-links the booking to that client (created if new).
 */
export const updateBooking = async (data: UpdateBookingData): Promise<Booking> => {
    const current = await ScheduleOperations.findBookingById(data._id);
    if (!current) throw new NotFoundError('Booking not found');

    // The rules apply to the booking as it will be after the update
    const slot = {
        therapistId: data.therapistId ?? String(current.therapistId),
        roomId: data.roomId ?? String(current.roomId),
        start: data.start ?? current.start,
        end: data.end ?? current.end,
        serviceId: data.serviceId ?? (current.serviceId ? String(current.serviceId) : undefined),
    };
    await assertBookingAllowed(
        slot,
        data._id,
        // Moving a booking whose service was archived since is fine; picking it anew is not
        { allowArchivedService: !data.serviceId || data.serviceId === String(current.serviceId) },
    );

    const patch: BookingRecordPatch = {
        _id: data._id,
        therapistId: data.therapistId,
        roomId: data.roomId,
        serviceId: data.serviceId,
        isRequested: data.isRequested,
        start: data.start,
        end: data.end,
    };

    // Promo: a new code is checked; the current one must still fit a moved booking
    if (data.promoCode !== undefined) {
        const code = data.promoCode.trim().toUpperCase();
        if (!code) {
            patch.promoId = null;
            patch.promoCode = null;
        } else {
            const keeping = code === current.promoCode;
            const promo = await resolvePromo(code, slot, { allowInactive: keeping });
            patch.promoId = String(promo._id);
            patch.promoCode = promo.code;
        }
    } else if (current.promoId && (data.start || data.serviceId)) {
        const promo = await ScheduleOperations.findPromoById(String(current.promoId));
        if (promo) await assertPromoApplies(promo, slot, { allowInactive: true });
    }

    if (data.clientMobile !== undefined) {
        const client = await findOrCreateClient({
            clientMobile: data.clientMobile,
            clientFirstName: data.clientFirstName,
            clientLastName: data.clientLastName,
        });
        patch.client = clientFullName(client);
        patch.clientId = String(client._id);
        patch.clientMobile = client.mobile;
    }

    const updatedBooking = await ScheduleOperations.updateBooking(patch);
    if (!updatedBooking) throw new NotFoundError('Booking not found');
    return updatedBooking;
};
