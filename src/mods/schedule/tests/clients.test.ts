import { beforeEach, describe, expect, it } from 'vitest';
import { bearer, gql as rawGql } from '../../../tests/graphql.helpers.js';
import { createRoleDoc, registerTestUser } from '../../auth/tests/auth.helpers.js';
import { RoleKind } from '../../roles/index.js';
import { UsersOperations } from '../../users/index.js';
import { BookingModel, ClientModel, RoomModel, ServiceModel, TherapistModel } from '../index.js';
import { normalizeMobile } from '../../../shared/mobile.js';

// Times in SCHEDULE_TIMEZONE (Asia/Manila). 2030-01-07 is a Monday.
const at = (date: string, time: string) => `${date}T${time}:00+08:00`;

let token = '';
let ana = '';
let ben = '';
let room = '';
let massage = '';
beforeEach(async () => {
    token = (await registerTestUser({ email: 'desk@example.com' })).token;
    ana = String((await TherapistModel.create({ name: 'Ana' }))._id);
    ben = String((await TherapistModel.create({ name: 'Ben' }))._id);
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

const CREATE = `mutation ($input: CreateBookingInput!) {
    createBooking(input: $input) { id client clientId clientMobile isRequested }
}`;
const STATS = 'visits upcoming firstVisit lastVisit requested favouriteTherapistName';
const BY_MOBILE = `query ($mobile: String!) {
    clientByMobile(mobile: $mobile) { id mobile firstName lastName fullName stats { ${STATS} } }
}`;
const SEARCH = `query ($search: String) {
    clients(search: $search) { total data { fullName mobile stats { visits } } }
}`;
const UPDATE_CLIENT = `mutation ($id: ID!, $input: UpdateClientInput!) {
    updateClient(id: $id, input: $input) { id mobile fullName notes }
}`;

interface BookingT {
    id: string;
    client: string;
    clientId: string;
    clientMobile: string;
    isRequested: boolean;
}

const book = async (extra: Record<string, unknown>) => {
    const res = await gql<{ createBooking: BookingT }>(CREATE, {
        input: {
            therapistId: ana,
            roomId: room,
            serviceId: massage,
            start: at('2030-01-07', '15:00'),
            end: at('2030-01-07', '16:00'),
            ...extra,
        },
    });
    return res;
};

describe('mobile numbers', () => {
    it('accepts every Philippine mobile format as the same number', () => {
        for (const typed of [
            '09171234567',
            '0917 123 4567',
            '0917-123-4567',
            '(0917) 123-4567',
            '0917.123.4567',
            '9171234567',
            '639171234567',
            '+639171234567',
            '+63 917 123 4567',
            '+63 (917) 123-4567',
            '0063 917 123 4567',
        ]) {
            expect(normalizeMobile(typed), typed).toBe('+639171234567');
        }
    });

    it('accepts international numbers with + and rejects landlines and junk', () => {
        expect(normalizeMobile('+1 415 555 0123')).toBe('+14155550123');
        expect(normalizeMobile('+81 90-1234-5678')).toBe('+819012345678');
        for (const bad of [
            '',
            '0917123456',
            '091712345678',
            '+6328123456',
            '028123456',
            '4155550123',
            'abc',
        ]) {
            expect(normalizeMobile(bad), bad).toBeNull();
        }
    });
});

describe('clients', () => {
    it('a booking with a new mobile creates the client; the next one reuses them', async () => {
        const first = await book({
            clientMobile: '0917 123 4567',
            clientFirstName: 'Juan',
            clientLastName: 'Cruz',
        });
        expect(first.body.errors).toBeUndefined();
        expect(first.body.data!.createBooking).toMatchObject({
            client: 'Juan Cruz',
            clientMobile: '+639171234567',
            isRequested: false,
        });

        // Same number typed differently, a different name typed: the client on file is used
        const second = await book({
            clientMobile: '+63 917 123 4567',
            clientFirstName: 'Johnny',
            start: at('2030-01-08', '15:00'),
            end: at('2030-01-08', '16:00'),
        });
        expect(second.body.data!.createBooking).toMatchObject({
            client: 'Juan Cruz',
            clientId: first.body.data!.createBooking.clientId,
        });
        expect(await ClientModel.countDocuments()).toBe(1);
    });

    it('a new mobile needs a first name; a bad mobile is rejected', async () => {
        const noName = await book({ clientMobile: '09181234567' });
        expect(noName.body.errors?.[0]).toMatchObject({
            message: 'Enter the first name: this mobile number is a new client',
            extensions: { code: 'VALIDATION_ERROR' },
        });
        expect(await ClientModel.countDocuments()).toBe(0);

        const bad = await book({ clientMobile: '12345', clientFirstName: 'X' });
        expect(bad.body.errors?.[0].extensions?.code).toBe('VALIDATION_ERROR');
    });

    it('a booking that breaks a rule creates no client', async () => {
        const res = await book({
            clientMobile: '09191234567',
            clientFirstName: 'Nobody',
            start: at('2030-01-07', '08:00'),
            end: at('2030-01-07', '09:00'),
        });
        expect(res.body.errors?.[0].extensions?.code).toBe('VALIDATION_ERROR');
        expect(await ClientModel.countDocuments()).toBe(0);
    });

    it('clientByMobile counts visits (ended bookings), upcoming, requests and the favourite therapist', async () => {
        const created = await book({ clientMobile: '09171234567', clientFirstName: 'Juan' });
        const clientId = created.body.data!.createBooking.clientId;
        const visit = (therapistId: string, day: string, isRequested: boolean) =>
            BookingModel.create({
                client: 'Juan',
                clientId,
                clientMobile: '+639171234567',
                therapistId,
                roomId: room,
                serviceId: massage,
                isRequested,
                start: new Date(`${day}T07:00:00Z`),
                end: new Date(`${day}T08:00:00Z`),
            });
        await visit(ben, '2026-01-05', true);
        await visit(ben, '2026-02-05', true);
        await visit(ana, '2026-03-05', false);

        const res = await gql<{ clientByMobile: { stats: Record<string, unknown> } }>(BY_MOBILE, {
            mobile: '0917-123-4567',
        });
        expect(res.body.errors).toBeUndefined();
        expect(res.body.data!.clientByMobile).toMatchObject({
            mobile: '+639171234567',
            fullName: 'Juan',
            stats: {
                visits: 3,
                upcoming: 1, // the 2030 booking
                firstVisit: '2026-01-05T07:00:00.000Z',
                lastVisit: '2026-03-05T07:00:00.000Z',
                requested: 2,
                favouriteTherapistName: 'Ben',
            },
        });

        const unknown = await gql<{ clientByMobile: unknown }>(BY_MOBILE, {
            mobile: '09990000000',
        });
        expect(unknown.body.data!.clientByMobile).toBeNull();
    });

    it('clients searches by name words or mobile digits', async () => {
        await book({
            clientMobile: '09171234567',
            clientFirstName: 'Juan',
            clientLastName: 'Dela Cruz',
        });
        await book({
            clientMobile: '09189876543',
            clientFirstName: 'Maria',
            clientLastName: 'Santos',
            start: at('2030-01-07', '17:00'),
            end: at('2030-01-07', '18:00'),
        });
        const byName = await gql<{ clients: { total: number; data: { fullName: string }[] } }>(
            SEARCH,
            {
                search: 'juan dela',
            },
        );
        expect(byName.body.data!.clients.data.map((c: { fullName: string }) => c.fullName)).toEqual(
            ['Juan Dela Cruz'],
        );
        const byDigits = await gql<{ clients: { data: { fullName: string }[] } }>(SEARCH, {
            search: '0918 987',
        });
        expect(
            byDigits.body.data!.clients.data.map((c: { fullName: string }) => c.fullName),
        ).toEqual(['Maria Santos']);
        const all = await gql<{ clients: { total: number } }>(SEARCH, {});
        expect(all.body.data!.clients.total).toBe(2);
    });

    it('updateClient renames the client on their bookings too; mobiles stay unique', async () => {
        const b = (await book({ clientMobile: '09171234567', clientFirstName: 'Juan' })).body.data!
            .createBooking;
        await book({
            clientMobile: '09181234567',
            clientFirstName: 'Pedro',
            start: at('2030-01-07', '17:00'),
            end: at('2030-01-07', '18:00'),
        });

        const res = await gql<{ updateClient: { fullName: string } }>(UPDATE_CLIENT, {
            id: b.clientId,
            input: { lastName: 'Cruz', notes: 'Prefers light pressure' },
        });
        expect(res.body.data!.updateClient).toMatchObject({
            fullName: 'Juan Cruz',
            notes: 'Prefers light pressure',
        });
        expect((await BookingModel.findById(b.id))!.client).toBe('Juan Cruz');

        const taken = await gql(UPDATE_CLIENT, {
            id: b.clientId,
            input: { mobile: '0918 123 4567' },
        });
        expect(taken.body.errors?.[0].extensions?.code).toBe('CLIENT_MOBILE_TAKEN');
    });

    it('needs readClients to look clients up', async () => {
        const viewer = await registerTestUser({ email: 'viewer@example.com' });
        await UsersOperations.setAccess(
            viewer.user.id,
            await createRoleDoc('viewer', RoleKind.user, []),
            [],
        );
        const res = await rawGql(SEARCH, {}, bearer(viewer.token));
        expect(res.body.errors?.[0].extensions?.code).toBe('FORBIDDEN');
    });
});
