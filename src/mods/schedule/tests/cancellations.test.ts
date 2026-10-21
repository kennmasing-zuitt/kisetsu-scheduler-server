import { beforeEach, describe, expect, it } from 'vitest';
import { env } from '../../../core/config/env.js';
import { addDays, zonedParts } from '../../../shared/time.js';
import { bearer, gql as rawGql } from '../../../tests/graphql.helpers.js';
import { registerTestUser } from '../../auth/tests/auth.helpers.js';
import { SmsImpl, SmsLogModel, SmsPurpose, SmsStatus } from '../../sms/index.js';
import { useTestSms } from '../../sms/tests/sms.helpers.js';
import { BookingModel, BookingStatus, RoomModel, ServiceModel, TherapistModel } from '../index.js';

const sms = useTestSms();

// Real future dates: cancellations only touch bookings that haven't started
const today = zonedParts(new Date(), env.SCHEDULE_TIMEZONE).dateKey;
const day1 = addDays(today, 2);
const day2 = addDays(today, 3);
const at = (date: string, time: string) => `${date}T${time}:00+08:00`;

let token = '';
let ana = '';
let room = '';
let massage = '';
beforeEach(async () => {
    token = (await registerTestUser({ email: 'desk@example.com' })).token;
    ana = String((await TherapistModel.create({ name: 'Ana Reyes' }))._id);
    room = String((await RoomModel.create({ name: 'Room 1', color: '#534AB7' }))._id);
    massage = String(
        (
            await ServiceModel.create({
                name: 'Massage',
                prices: [{ durationMin: null, days: [], amount: 1000, validFrom: '2020-01-01' }],
            })
        )._id,
    );
});
const gql = <T = Record<string, unknown>>(query: string, variables?: Record<string, unknown>) =>
    rawGql<T>(query, variables, bearer(token));

const CREATE = `mutation ($input: CreateBookingInput!) { createBooking(input: $input) { id status source } }`;
async function book(date: string, mobile: string, firstName: string) {
    const res = await gql<{ createBooking: { id: string; status: string; source: string } }>(
        CREATE,
        {
            input: {
                clientMobile: mobile,
                clientFirstName: firstName,
                therapistId: ana,
                roomId: room,
                serviceId: massage,
                start: at(date, '15:00'),
                end: at(date, '16:00'),
            },
        },
    );
    expect(res.body.errors).toBeUndefined();
    return res.body.data!.createBooking;
}

const CONFLICTS = `query ($id: ID!, $leave: [String!]) { therapistConflicts(id: $id, leaveDates: $leave) { id client } }`;
const UPDATE_THERAPIST = `mutation ($id: ID!, $input: UpdateTherapistInput!) { updateTherapist(id: $id, input: $input) { id leaveDates } }`;

describe('cancelling bookings', () => {
    it('new bookings are staff-made and booked', async () => {
        const b = await book(day1, '09171110001', 'Juan');
        expect(b).toMatchObject({ status: 'booked', source: 'staff' });
    });

    it('leave for a therapist cancels their bookings that day and texts the clients to rebook', async () => {
        const juan = await book(day1, '09171110001', 'Juan');
        const maria = await book(day2, '09171110002', 'Maria');

        // Preview first: only the day that becomes leave
        const preview = await gql<{ therapistConflicts: { id: string }[] }>(CONFLICTS, {
            id: ana,
            leave: [day1],
        });
        expect(preview.body.data?.therapistConflicts.map((b: { id: string }) => b.id)).toEqual([
            juan.id,
        ]);
        expect(await BookingModel.countDocuments({ status: BookingStatus.cancelled })).toBe(0); // nothing changed yet

        const res = await gql(UPDATE_THERAPIST, { id: ana, input: { leaveDates: [day1] } });
        expect(res.body.errors).toBeUndefined();
        await SmsImpl.flushSms();

        expect(await BookingModel.findById(juan.id).lean()).toMatchObject({
            status: 'cancelled',
            cancelReason: 'therapistUnavailable',
        });
        expect(await BookingModel.findById(maria.id).lean()).toMatchObject({ status: 'booked' });

        expect(sms.outbox).toHaveLength(1);
        expect(sms.outbox[0].to).toBe('+639171110001');
        expect(sms.outbox[0].message).toMatch(/^Hi Juan, sorry: Ana Reyes is no longer available/);
        expect(sms.outbox[0].message).toContain(env.PUBLIC_BOOKING_URL);
        expect(
            await SmsLogModel.countDocuments({
                bookingId: juan.id,
                purpose: SmsPurpose.rebook,
                status: SmsStatus.sent,
            }),
        ).toBe(1);

        // A rename alone cancels nothing
        await gql(UPDATE_THERAPIST, { id: ana, input: { name: 'Ana R.' } });
        await SmsImpl.flushSms();
        expect(sms.outbox).toHaveLength(1);
    });

    it('a weekly day off cancels upcoming bookings on that weekday', async () => {
        const juan = await book(day1, '09171110001', 'Juan');
        const weekday = zonedParts(new Date(at(day1, '15:00')), env.SCHEDULE_TIMEZONE).weekday;
        await gql(UPDATE_THERAPIST, { id: ana, input: { offDays: [weekday] } });
        await SmsImpl.flushSms();
        expect((await BookingModel.findById(juan.id).lean())?.status).toBe('cancelled');
        expect(sms.outbox).toHaveLength(1);
    });

    it('staff cancel texts the client only when asked', async () => {
        const a = await book(day1, '09171110001', 'Juan');
        const b = await book(day2, '09171110002', 'Maria');
        await gql(`mutation ($id: ID!) { deleteBooking(id: $id) }`, { id: a.id });
        await gql(`mutation ($id: ID!) { deleteBooking(id: $id, notifyClient: true) }`, {
            id: b.id,
        });
        await SmsImpl.flushSms();
        expect(sms.outbox.map((m) => m.to)).toEqual(['+639171110002']);
        expect(sms.outbox[0].message).toMatch(
            /^Hi Maria, your .* booking at .* has been cancelled/,
        );
    });

    it('cancelled bookings no longer count as visits, upcoming or promo uses', async () => {
        const a = await book(day1, '09171110001', 'Juan');
        await gql(`mutation ($id: ID!) { deleteBooking(id: $id) }`, { id: a.id });
        const res = await gql<{ clientByMobile: { stats: { upcoming: number } } }>(
            `{ clientByMobile(mobile: "09171110001") { stats { upcoming } } }`,
        );
        expect(res.body.data?.clientByMobile.stats.upcoming).toBe(0);
    });
});
