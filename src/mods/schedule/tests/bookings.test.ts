import { beforeEach, describe, expect, it } from 'vitest';
import { bearer, gql as rawGql } from '../../../tests/graphql.helpers.js';
import { createRoleDoc, registerTestUser } from '../../auth/tests/auth.helpers.js';
import { RoleKind } from '../../roles/index.js';
import { RoomModel, ServiceModel, TherapistModel } from '../index.js';
import { UsersOperations } from '../../users/index.js';

// Times are written in the default SCHEDULE_TIMEZONE (Asia/Manila, UTC+8, no DST).
// 2030-01-06 is a Sunday, 2030-01-07 a Monday.
const at = (date: string, time: string) => `${date}T${time}:00+08:00`;
const MON = '2030-01-07';
const SUN = '2030-01-06';

// The default `user` role holds createBooking / updateBooking / deleteBooking
let token = '';
let ana = '';
let ben = '';
let room1 = '';
let room2 = '';
// Priced for any length on any day, so the scheduling tests aren't about prices
let massage = '';
beforeEach(async () => {
    token = (await registerTestUser({ email: 'desk@example.com' })).token;
    ana = String((await TherapistModel.create({ name: 'Ana', offDays: [0] }))._id);
    ben = String((await TherapistModel.create({ name: 'Ben', leaveDates: ['2030-01-08'] }))._id);
    room1 = String((await RoomModel.create({ name: 'Room 1', color: '#534AB7' }))._id);
    room2 = String((await RoomModel.create({ name: 'Room 2', color: '#0F6E56' }))._id);
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

const FIELDS =
    'id client clientId clientMobile isRequested promoCode therapistId roomId serviceId start end createdAt updatedAt';

const CREATE = `mutation ($input: CreateBookingInput!) { createBooking(input: $input) { ${FIELDS} } }`;
const UPDATE = `mutation ($id: ID!, $input: UpdateBookingInput!) {
    updateBooking(id: $id, input: $input) { ${FIELDS} }
}`;
const DELETE = `mutation ($id: ID!) { deleteBooking(id: $id) }`;
const GET_ONE = `query ($id: ID!) { booking(id: $id) { ${FIELDS} } }`;
const LIST = `query ($from: DateTime!, $to: DateTime!, $therapistId: ID, $roomId: ID) {
    bookings(from: $from, to: $to, therapistId: $therapistId, roomId: $roomId) { ${FIELDS} }
}`;

interface BookingT {
    id: string;
    client: string;
    therapistId: string;
    roomId: string;
    serviceId: string | null;
    start: string;
    end: string;
}

const MISSING_ID = '000000000000000000000000';

interface Slot {
    client?: string;
    therapistId?: string;
    roomId?: string;
    serviceId?: string;
    start?: string;
    end?: string;
}

// Each client name gets its own mobile (clients are identified by mobile)
const mobiles = new Map<string, string>();
const mobileFor = (name: string) => {
    if (!mobiles.has(name)) mobiles.set(name, `0917${String(1_000_000 + mobiles.size)}`);
    return mobiles.get(name)!;
};

const input = ({ client = 'Mr. Cruz', ...slot }: Slot = {}) => ({
    clientMobile: mobileFor(client.trim()),
    clientFirstName: client,
    therapistId: ana,
    roomId: room1,
    serviceId: massage,
    start: at(MON, '15:00'),
    end: at(MON, '16:00'),
    ...slot,
});

async function create(slot: Slot = {}) {
    const res = await gql<{ createBooking: BookingT }>(CREATE, { input: input(slot) });
    expect(res.body.errors).toBeUndefined();
    return res.body.data!.createBooking;
}

const errorCode = (res: { body: { errors?: { extensions?: { code?: string } }[] } }) =>
    res.body.errors?.[0]?.extensions?.code;

describe('bookings module', () => {
    it('createBooking stores the booking and returns ids and ISO dates', async () => {
        const b = await create({ client: '  Mr. Cruz ' });
        expect(b).toMatchObject({
            client: 'Mr. Cruz',
            therapistId: ana,
            roomId: room1,
            start: new Date(at(MON, '15:00')).toISOString(),
            end: new Date(at(MON, '16:00')).toISOString(),
        });
        expect(b.id).toMatch(/^[a-f0-9]{24}$/);

        const found = await gql<{ booking: BookingT | null }>(GET_ONE, { id: b.id });
        expect(found.body.data?.booking?.id).toBe(b.id);
    });

    it('bookings returns what overlaps the range, earliest first, optionally per therapist', async () => {
        await create({ client: 'Late', start: at(MON, '18:00'), end: at(MON, '19:00') });
        await create({ client: 'Early', start: at(MON, '11:00'), end: at(MON, '12:00') });
        await create({
            client: 'Ben',
            therapistId: ben,
            roomId: room2,
            start: at(MON, '11:00'),
            end: at(MON, '12:00'),
        });
        await create({
            client: 'Next day',
            start: at('2030-01-09', '11:00'),
            end: at('2030-01-09', '12:00'),
        });

        const day = { from: at(MON, '00:00'), to: at('2030-01-08', '00:00') };
        const all = await gql<{ bookings: BookingT[] }>(LIST, day);
        expect(all.body.errors).toBeUndefined();
        expect(all.body.data!.bookings.map((b: BookingT) => b.client)).toEqual([
            'Early',
            'Ben',
            'Late',
        ]);

        const onlyAna = await gql<{ bookings: BookingT[] }>(LIST, { ...day, therapistId: ana });
        expect(onlyAna.body.data!.bookings.map((b: BookingT) => b.client)).toEqual([
            'Early',
            'Late',
        ]);
    });

    it('rejects a room that is already taken, but allows back-to-back bookings', async () => {
        await create();
        const clash = await gql(CREATE, {
            input: input({ therapistId: ben, start: at(MON, '15:30'), end: at(MON, '16:30') }),
        });
        expect(errorCode(clash)).toBe('ROOM_TAKEN');

        const backToBack = await gql(CREATE, {
            input: input({ therapistId: ben, start: at(MON, '16:00'), end: at(MON, '17:00') }),
        });
        expect(backToBack.body.errors).toBeUndefined();
    });

    it('rejects double-booking a therapist, even in another room', async () => {
        await create();
        const res = await gql(CREATE, {
            input: input({ roomId: room2, start: at(MON, '15:50'), end: at(MON, '17:00') }),
        });
        expect(res.body.errors?.[0]).toMatchObject({
            message: 'Ana already has a booking at that time',
            extensions: { code: 'THERAPIST_DOUBLE_BOOKED', status: 409 },
        });
    });

    it("rejects a therapist's weekly day off and leave dates", async () => {
        const dayOff = await gql(CREATE, {
            input: input({ start: at(SUN, '15:00'), end: at(SUN, '16:00') }),
        });
        expect(dayOff.body.errors?.[0]).toMatchObject({
            message: 'Ana is off on that day',
            extensions: { code: 'THERAPIST_UNAVAILABLE' },
        });

        const leave = await gql(CREATE, {
            input: input({
                therapistId: ben,
                start: at('2030-01-08', '15:00'),
                end: at('2030-01-08', '16:00'),
            }),
        });
        expect(errorCode(leave)).toBe('THERAPIST_UNAVAILABLE');
    });

    it('enforces opening hours, end after start and the maximum length', async () => {
        const early = await gql(CREATE, { input: input({ start: at(MON, '09:30') }) });
        expect(errorCode(early)).toBe('VALIDATION_ERROR');

        const late = await gql(CREATE, {
            input: input({ start: at(MON, '21:30'), end: at(MON, '22:30') }),
        });
        expect(late.body.errors?.[0].message).toBe(
            'Bookings must fit between 10:00 and 22:00 on one day',
        );

        const lastSlot = await gql(CREATE, {
            input: input({ start: at(MON, '21:00'), end: at(MON, '22:00') }),
        });
        expect(lastSlot.body.errors).toBeUndefined();

        const backwards = await gql(CREATE, { input: input({ end: at(MON, '14:00') }) });
        expect(backwards.body.errors?.[0].message).toBe('A booking must end after it starts');
    });

    it('rejects unknown therapists and rooms with NOT_FOUND', async () => {
        const res = await gql(CREATE, { input: input({ roomId: MISSING_ID }) });
        expect(res.body.errors?.[0]).toMatchObject({
            message: 'Room not found',
            extensions: { code: 'NOT_FOUND' },
        });
    });

    it('updateBooking moves a booking without clashing with itself', async () => {
        const b = await create();
        const moved = await gql<{ updateBooking: BookingT }>(UPDATE, {
            id: b.id,
            input: { start: at(MON, '15:30'), end: at(MON, '16:30') },
        });
        expect(moved.body.errors).toBeUndefined();
        expect(moved.body.data!.updateBooking).toMatchObject({
            client: 'Mr. Cruz',
            roomId: room1,
            start: new Date(at(MON, '15:30')).toISOString(),
        });

        const requested = await gql<{ updateBooking: BookingT & { isRequested: boolean } }>(
            UPDATE,
            {
                id: b.id,
                input: { isRequested: true },
            },
        );
        expect(requested.body.data!.updateBooking.isRequested).toBe(true);
    });

    it('updateBooking checks the merged result against other bookings', async () => {
        const first = await create();
        const second = await create({
            therapistId: ben,
            roomId: room2,
            start: at(MON, '17:00'),
            end: at(MON, '18:00'),
        });

        // Reassign Ben's booking to Ana at Ana's busy time
        const res = await gql(UPDATE, {
            id: second.id,
            input: { therapistId: ana, start: first.start, end: first.end },
        });
        expect(errorCode(res)).toBe('THERAPIST_DOUBLE_BOOKED');

        const empty = await gql(UPDATE, { id: second.id, input: {} });
        expect(errorCode(empty)).toBe('VALIDATION_ERROR');

        const missing = await gql(UPDATE, { id: MISSING_ID, input: { isRequested: true } });
        expect(errorCode(missing)).toBe('NOT_FOUND');
    });

    it('deleteBooking frees the slot, then reports NOT_FOUND on a second attempt', async () => {
        const b = await create();
        const first = await gql<{ deleteBooking: boolean }>(DELETE, { id: b.id });
        expect(first.body.data?.deleteBooking).toBe(true);

        const second = await gql(DELETE, { id: b.id });
        expect(errorCode(second)).toBe('NOT_FOUND');

        await create(); // the same slot is free again
    });

    it('validates the range and ids', async () => {
        const backwards = await gql(LIST, { from: at(MON, '10:00'), to: at(MON, '09:00') });
        expect(errorCode(backwards)).toBe('VALIDATION_ERROR');

        const tooWide = await gql(LIST, { from: at(MON, '00:00'), to: at('2030-06-01', '00:00') });
        expect(errorCode(tooWide)).toBe('VALIDATION_ERROR');

        const badId = await gql(DELETE, { id: 'not-an-object-id' });
        expect(errorCode(badId)).toBe('VALIDATION_ERROR');
    });
});

describe('booking prices', () => {
    // Fuyu: 60 and 80 minutes, priced from Feb 2030 for 60 minutes only on weekends
    let fuyu = '';
    beforeEach(async () => {
        fuyu = String(
            (
                await ServiceModel.create({
                    name: 'Fuyu',
                    prices: [
                        { durationMin: 60, amount: 1099, validFrom: '2025-01-01' },
                        { durationMin: 80, amount: 1199, validFrom: '2025-01-01' },
                    ],
                })
            )._id,
        );
    });

    it('stores the service and accepts a priced length', async () => {
        const b = await create({ serviceId: fuyu, end: at(MON, '16:20') });
        expect(b.serviceId).toBe(fuyu);
    });

    it('rejects a length the service has no price for, listing the priced ones', async () => {
        const res = await gql(CREATE, { input: input({ serviceId: fuyu, end: at(MON, '16:30') }) });
        expect(res.body.errors?.[0]).toMatchObject({
            message: 'Fuyu has no price for 90 minutes on 2030-01-07 (available: 60, 80 minutes)',
            extensions: { code: 'VALIDATION_ERROR' },
        });
    });

    it('rejects dates outside every price period', async () => {
        await ServiceModel.updateOne(
            { _id: fuyu },
            { $set: { 'prices.0.validFrom': '2030-02-01', 'prices.1.validFrom': '2030-02-01' } },
        );
        const res = await gql(CREATE, { input: input({ serviceId: fuyu }) });
        expect(res.body.errors?.[0].message).toBe('Fuyu has no price for 60 minutes on 2030-01-07');
    });

    it('rejects resizing to an unpriced length', async () => {
        const b = await create({ serviceId: fuyu });
        const res = await gql(UPDATE, { id: b.id, input: { end: at(MON, '16:10') } });
        expect(res.body.errors?.[0].extensions?.code).toBe('VALIDATION_ERROR');
    });

    it('archived services: no new bookings, but existing ones can still move', async () => {
        const b = await create({ serviceId: fuyu });
        await ServiceModel.updateOne({ _id: fuyu }, { $set: { isActive: false } });

        const fresh = await gql(CREATE, {
            input: input({ serviceId: fuyu, start: at(MON, '17:00'), end: at(MON, '18:00') }),
        });
        expect(fresh.body.errors?.[0].message).toBe('Fuyu is no longer offered');

        const moved = await gql(UPDATE, {
            id: b.id,
            input: { start: at(MON, '18:00'), end: at(MON, '19:00') },
        });
        expect(moved.body.errors).toBeUndefined();
    });

    it('rejects an unknown service', async () => {
        const res = await gql(CREATE, { input: input({ serviceId: MISSING_ID }) });
        expect(res.body.errors?.[0].message).toBe('Service not found');
    });
});

describe('bookings permissions', () => {
    it('reads require a token', async () => {
        const res = await rawGql(LIST, { from: at(MON, '00:00'), to: at(MON, '23:59') });
        expect(errorCode(res)).toBe('UNAUTHENTICATED');
    });

    it('a role without booking permissions can read but not book', async () => {
        const viewer = await registerTestUser({ email: 'viewer@example.com' });
        await UsersOperations.setAccess(
            viewer.user.id,
            await createRoleDoc('viewer', RoleKind.user, []),
            [],
        );

        const read = await rawGql(
            LIST,
            { from: at(MON, '00:00'), to: at(MON, '23:59') },
            bearer(viewer.token),
        );
        expect(read.body.errors).toBeUndefined();

        const res = await rawGql(CREATE, { input: input() }, bearer(viewer.token));
        expect(res.body.errors?.[0]).toMatchObject({
            message: 'Missing permission: createBooking',
            extensions: { code: 'FORBIDDEN' },
        });
    });
});
