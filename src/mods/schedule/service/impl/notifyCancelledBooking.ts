import { env } from '../../../../core/config/env.js';
import { SmsImpl, SmsPurpose } from '../../../sms/index.js';
import { CancelReason } from '../../db/_schedule.enum.js';
import type { Booking } from '../../db/_schedule.types.js';
import * as ScheduleOperations from '../../db/repository/index.js';

/** "Sat, Oct 25, 3:00 PM" in the business time zone */
export const formatBookingTime = (when: Date): string =>
    new Intl.DateTimeFormat('en-US', {
        timeZone: env.SCHEDULE_TIMEZONE,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(when);

/** The text for a cancelled booking (kept to one or two SMS segments). */
export function cancellationMessage(
    firstName: string,
    therapistName: string,
    booking: Pick<Booking, 'start'>,
    reason: CancelReason,
): string {
    const when = formatBookingTime(booking.start);
    const callUs = env.SPA_PHONE ? ` or call ${env.SPA_PHONE}` : '';
    const hi = firstName ? `Hi ${firstName}, ` : 'Hi, ';
    if (reason === CancelReason.therapistUnavailable) {
        return (
            `${hi}sorry: ${therapistName} is no longer available for your ${when} booking at ` +
            `${env.BUSINESS_NAME}, so it was cancelled. Please rebook at ${env.PUBLIC_BOOKING_URL}${callUs}.`
        );
    }
    return (
        `${hi}your ${when} booking at ${env.BUSINESS_NAME} has been cancelled. ` +
        `To book again, visit ${env.PUBLIC_BOOKING_URL}${callUs}.`
    );
}

/**
 * Texts the client that their booking was cancelled (in the background, retried, logged in
 * SmsLog). Bookings without a mobile number (made before mobiles were required) are skipped.
 * Returns whether a text was queued.
 */
export async function notifyCancelledBooking(
    booking: Booking,
    reason: CancelReason,
): Promise<boolean> {
    if (!booking.clientMobile) return false;
    const [client, therapist] = await Promise.all([
        booking.clientId ? ScheduleOperations.findClientById(String(booking.clientId)) : null,
        ScheduleOperations.findTherapistById(String(booking.therapistId)),
    ]);
    const firstName = client?.firstName ?? booking.client.split(' ')[0] ?? '';
    SmsImpl.queueSms({
        to: booking.clientMobile,
        purpose: SmsPurpose.rebook,
        message: cancellationMessage(
            firstName,
            therapist?.name ?? 'Your therapist',
            booking,
            reason,
        ),
        clientId: booking.clientId ? String(booking.clientId) : null,
        bookingId: String(booking._id),
    });
    return true;
}
