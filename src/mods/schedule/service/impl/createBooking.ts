import type { BookingDocument, CreateBookingData } from '../../db/_schedule.types.js';
import * as ScheduleOperations from '../../db/repository/index.js';
import { assertBookingAllowed } from './assertBookingAllowed.js';
import { resolvePromo } from './assertPromoApplies.js';
import { clientFullName } from './clientName.js';
import { findOrCreateClient } from './findOrCreateClient.js';

/**
 * Books a client. Checks every scheduling rule and the promo first, then finds the client by
 * mobile (creating them when the number is new) and stores the booking.
 */
export const createBooking = async (data: CreateBookingData): Promise<BookingDocument> => {
    await assertBookingAllowed(data);
    const promo = data.promoCode
        ? await resolvePromo(data.promoCode, { start: data.start, serviceId: data.serviceId })
        : null;
    const client = await findOrCreateClient(data);

    return ScheduleOperations.createBooking({
        client: clientFullName(client),
        clientId: String(client._id),
        clientMobile: client.mobile,
        therapistId: data.therapistId,
        roomId: data.roomId,
        serviceId: data.serviceId,
        isRequested: data.isRequested,
        promoId: promo ? String(promo._id) : null,
        promoCode: promo?.code ?? null,
        start: data.start,
        end: data.end,
        createdBy: data.createdBy,
        source: data.source,
    });
};
