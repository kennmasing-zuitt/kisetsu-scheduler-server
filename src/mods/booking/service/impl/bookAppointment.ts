import { env } from '../../../../core/config/env.js';
import { AppError, ConflictError, NotFoundError } from '../../../../shared/errors/AppError.js';
import { zonedParts } from '../../../../shared/time.js';
import { BookingSource, ScheduleImpl, ScheduleOperations } from '../../../schedule/index.js';
import type { AppointmentConfirmation, AppointmentRequest } from '../../db/_booking.types.js';
import { availableSlots } from './availableSlots.js';
import { priceFor } from './bookingOptions.js';
import {
    assertStartBookable,
    bookingWindow,
    MAX_UPCOMING_ONLINE_BOOKINGS,
} from './bookingWindow.js';

const slotTaken = () =>
    new ConflictError('Sorry, that time was just taken. Please pick another.', 'SLOT_TAKEN');

/**
 * Books for the signed-in client. With a therapist chosen, the booking is marked as requested
 * by name; with "any", the free therapist with the fewest bookings that day gets it. A free room
 * is picked. Same rules as staff bookings (assertBookingAllowed), plus the online window and a
 * cap of MAX_UPCOMING_ONLINE_BOOKINGS upcoming online bookings. No promo codes online.
 */
export async function bookAppointment(
    clientId: string,
    request: AppointmentRequest,
    now = new Date(),
): Promise<AppointmentConfirmation> {
    const window = bookingWindow(now);
    assertStartBookable(request.start, window);

    const client = await ScheduleOperations.findClientById(clientId);
    if (!client) throw new NotFoundError('Client not found');
    const upcoming = await ScheduleOperations.countUpcomingClientBookings(
        clientId,
        now,
        BookingSource.client,
    );
    if (upcoming >= MAX_UPCOMING_ONLINE_BOOKINGS) {
        throw new AppError(
            409,
            'TOO_MANY_BOOKINGS',
            `You already have ${upcoming} upcoming bookings. Please call us to book more.`,
        );
    }

    const date = zonedParts(request.start, env.SCHEDULE_TIMEZONE).dateKey;
    const { service, price } = await priceFor(request.serviceId, request.durationMin, date);
    const end = new Date(request.start.getTime() + request.durationMin * 60_000);

    const slots = await availableSlots(
        {
            date,
            serviceId: request.serviceId,
            durationMin: request.durationMin,
            therapistId: request.therapistId,
        },
        now,
    );
    const slot = slots.find((s) => s.start.getTime() === request.start.getTime());
    if (!slot) throw slotTaken();

    // Least busy first, so "any therapist" spreads the work
    const dayBookings = await ScheduleOperations.readBookings({
        from: new Date(request.start.getTime() - 24 * 3600_000),
        to: new Date(request.start.getTime() + 24 * 3600_000),
    });
    const load = (id: string) =>
        dayBookings.filter(
            (b) =>
                String(b.therapistId) === id &&
                zonedParts(b.start, env.SCHEDULE_TIMEZONE).dateKey === date,
        ).length;
    const therapistIds = [...slot.therapistIds].sort((a, b) => load(a) - load(b));
    const rooms = await ScheduleImpl.readRooms();
    const roster = await ScheduleImpl.readTherapists();

    // Another booking can land between reading the slots and saving: try the next pairing
    for (const therapistId of therapistIds) {
        for (const room of rooms) {
            try {
                const booking = await ScheduleImpl.createBooking({
                    clientMobile: client.mobile,
                    therapistId,
                    roomId: String(room._id),
                    serviceId: request.serviceId,
                    start: request.start,
                    end,
                    isRequested: Boolean(request.therapistId),
                    source: BookingSource.client,
                });
                const therapist = roster.find((t) => String(t._id) === therapistId);
                return {
                    bookingId: String(booking._id),
                    start: booking.start,
                    end: booking.end,
                    serviceName: service.name,
                    durationMin: request.durationMin,
                    therapistName: therapist?.name.split(' ')[0] ?? 'Your therapist',
                    price,
                };
            } catch (err) {
                const code = err instanceof AppError ? err.code : '';
                if (code === 'ROOM_TAKEN') continue;
                if (code === 'THERAPIST_DOUBLE_BOOKED' || code === 'THERAPIST_UNAVAILABLE') break;
                throw err;
            }
        }
    }
    throw slotTaken();
}
