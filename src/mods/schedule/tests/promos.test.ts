import { beforeEach, describe, expect, it } from 'vitest';
import { bearer, gql } from '../../../tests/graphql.helpers.js';
import { createAdmin, registerTestUser } from '../../auth/tests/auth.helpers.js';
import { RoomModel, ServiceModel, TherapistModel } from '../index.js';

// Times in SCHEDULE_TIMEZONE (Asia/Manila). 2030-01-07 is a Monday.
const at = (date: string, time: string) => `${date}T${time}:00+08:00`;

const PROMO =
    'id code description discountType value validFrom validTo serviceIds isActive timesUsed isLocked';
const CREATE_PROMO = `mutation ($input: CreatePromoInput!) { createPromo(input: $input) { ${PROMO} } }`;
const UPDATE_PROMO = `mutation ($id: ID!, $input: UpdatePromoInput!) { updatePromo(id: $id, input: $input) { ${PROMO} } }`;
const DELETE_PROMO = `mutation ($id: ID!) { deletePromo(id: $id) }`;
const LIST = `query ($includeArchived: Boolean) { promos(includeArchived: $includeArchived) { code isActive } }`;
const CREATE_BOOKING = `mutation ($input: CreateBookingInput!) { createBooking(input: $input) { id promoId promoCode } }`;
const UPDATE_BOOKING = `mutation ($id: ID!, $input: UpdateBookingInput!) {
    updateBooking(id: $id, input: $input) { id promoCode start }
}`;

interface PromoT {
    id: string;
    code: string;
    discountType: string;
    value: number;
    validTo: string | null;
    isActive: boolean;
    timesUsed: number;
    isLocked: boolean;
}

let admin = '';
let ana = '';
let room = '';
let massage = '';
let facial = '';
beforeEach(async () => {
    admin = (await createAdmin()).token;
    ana = String((await TherapistModel.create({ name: 'Ana' }))._id);
    room = String((await RoomModel.create({ name: 'Room 1', color: '#534AB7' }))._id);
    const anyLength = [{ durationMin: null, days: [], amount: 1000, validFrom: '2020-01-01' }];
    massage = String((await ServiceModel.create({ name: 'Massage', prices: anyLength }))._id);
    facial = String((await ServiceModel.create({ name: 'Facial', prices: anyLength }))._id);
});

async function createPromo(input: Record<string, unknown>) {
    const res = await gql<{ createPromo: PromoT }>(
        CREATE_PROMO,
        { input: { discountType: 'percent', value: 10, validFrom: '2030-01-01', ...input } },
        bearer(admin),
    );
    expect(res.body.errors).toBeUndefined();
    return res.body.data!.createPromo;
}

let slot = 0;
const book = (extra: Record<string, unknown> = {}) => {
    const hour = 10 + slot++;
    return gql<{ createBooking: { id: string; promoCode: string | null } }>(
        CREATE_BOOKING,
        {
            input: {
                clientMobile: '09171234567',
                clientFirstName: 'Juan',
                therapistId: ana,
                roomId: room,
                serviceId: massage,
                start: at('2030-01-07', `${hour}:00`),
                end: at('2030-01-07', `${hour}:30`),
                ...extra,
            },
        },
        bearer(admin),
    );
};
beforeEach(() => {
    slot = 0;
});

describe('promos', () => {
    it('codes are stored upper-case and unique', async () => {
        const p = await createPromo({ code: ' kisetsu10 ' });
        expect(p).toMatchObject({
            code: 'KISETSU10',
            isActive: true,
            timesUsed: 0,
            isLocked: false,
        });
        const dup = await gql(
            CREATE_PROMO,
            {
                input: {
                    code: 'Kisetsu10',
                    discountType: 'amount',
                    value: 100,
                    validFrom: '2030-01-01',
                },
            },
            bearer(admin),
        );
        expect(dup.body.errors?.[0].extensions?.code).toBe('PROMO_CODE_TAKEN');
    });

    it('rejects a percent above 100 and bad codes', async () => {
        const over = await gql(
            CREATE_PROMO,
            {
                input: {
                    code: 'BIG',
                    discountType: 'percent',
                    value: 120,
                    validFrom: '2030-01-01',
                },
            },
            bearer(admin),
        );
        expect(over.body.errors?.[0].extensions?.code).toBe('VALIDATION_ERROR');
        const bad = await gql(
            CREATE_PROMO,
            {
                input: {
                    code: 'no spaces',
                    discountType: 'amount',
                    value: 1,
                    validFrom: '2030-01-01',
                },
            },
            bearer(admin),
        );
        expect(bad.body.errors?.[0].extensions?.code).toBe('VALIDATION_ERROR');
    });

    it('a booking can use one promo; the code is checked against date, service and status', async () => {
        await createPromo({ code: 'JAN', validTo: '2030-01-31' });
        await createPromo({ code: 'LATER', validFrom: '2030-02-01' });
        await createPromo({ code: 'FACIAL', serviceIds: [facial] });
        const off = await createPromo({ code: 'OFF' });
        await gql(UPDATE_PROMO, { id: off.id, input: { isActive: false } }, bearer(admin));

        const ok = await book({ promoCode: 'jan' });
        expect(ok.body.data!.createBooking.promoCode).toBe('JAN');

        for (const [code, message] of [
            ['LATER', 'LATER can be used from 2030-02-01'],
            ['FACIAL', "FACIAL doesn't apply to Massage"],
            ['OFF', 'OFF is not active'],
            ['NOPE', 'Promo code "NOPE" doesn\'t exist'],
        ]) {
            const res = await book({ promoCode: code });
            expect(res.body.errors?.[0], code).toMatchObject({
                message,
                extensions: { code: 'PROMO_NOT_APPLICABLE' },
            });
        }
    });

    it('a moved booking must still fit its promo; "" removes the promo', async () => {
        await createPromo({ code: 'JAN', validTo: '2030-01-31' });
        const b = (await book({ promoCode: 'JAN' })).body.data!.createBooking;

        const moved = await gql(
            UPDATE_BOOKING,
            {
                id: b.id,
                input: { start: at('2030-02-04', '15:00'), end: at('2030-02-04', '15:30') },
            },
            bearer(admin),
        );
        expect(moved.body.errors?.[0].message).toBe('JAN ended on 2030-01-31');

        const removed = await gql<{ updateBooking: { promoCode: string | null } }>(
            UPDATE_BOOKING,
            {
                id: b.id,
                input: { promoCode: '' },
            },
            bearer(admin),
        );
        expect(removed.body.data!.updateBooking.promoCode).toBeNull();
    });

    it('archive / activate any time; once used, the terms lock but the rest stays editable', async () => {
        const p = await createPromo({ code: 'TEN' });
        // Unused: terms can still change
        const edited = await gql<{ updatePromo: PromoT }>(
            UPDATE_PROMO,
            {
                id: p.id,
                input: { value: 15 },
            },
            bearer(admin),
        );
        expect(edited.body.data!.updatePromo.value).toBe(15);

        await book({ promoCode: 'TEN' });

        const locked = await gql(UPDATE_PROMO, { id: p.id, input: { value: 20 } }, bearer(admin));
        expect(locked.body.errors?.[0].extensions).toMatchObject({
            code: 'PROMO_LOCKED',
            status: 409,
        });
        const recoded = await gql(
            UPDATE_PROMO,
            { id: p.id, input: { code: 'TWENTY' } },
            bearer(admin),
        );
        expect(recoded.body.errors?.[0].extensions?.code).toBe('PROMO_LOCKED');

        // Still editable after use: archive, re-activate, description, period
        for (const input of [
            { isActive: false },
            { isActive: true },
            { description: 'Ten percent off', validTo: '2030-12-31' },
            { validTo: null },
        ]) {
            const res = await gql<{ updatePromo: PromoT }>(
                UPDATE_PROMO,
                { id: p.id, input },
                bearer(admin),
            );
            expect(res.body.errors, JSON.stringify(input)).toBeUndefined();
        }
        const after = await gql<{ updatePromo: PromoT }>(
            UPDATE_PROMO,
            {
                id: p.id,
                input: { isActive: false },
            },
            bearer(admin),
        );
        expect(after.body.data!.updatePromo).toMatchObject({
            isActive: false,
            timesUsed: 1,
            isLocked: true,
            validTo: null,
        });

        const list = await gql<{ promos: PromoT[] }>(LIST, {}, bearer(admin));
        expect(list.body.data!.promos).toHaveLength(0);
        const all = await gql<{ promos: PromoT[] }>(LIST, { includeArchived: true }, bearer(admin));
        expect(all.body.data!.promos.map((x: PromoT) => x.code)).toEqual(['TEN']);

        const del = await gql(DELETE_PROMO, { id: p.id }, bearer(admin));
        expect(del.body.errors?.[0].extensions?.code).toBe('PROMO_IN_USE');
    });

    it('an unused promo can be deleted', async () => {
        const p = await createPromo({ code: 'TEMP' });
        const res = await gql<{ deletePromo: boolean }>(DELETE_PROMO, { id: p.id }, bearer(admin));
        expect(res.body.data!.deletePromo).toBe(true);
    });

    it('the default user role can read promos but not manage them', async () => {
        await createPromo({ code: 'TEN' });
        const user = await registerTestUser({ email: 'desk@example.com' });
        const read = await gql<{ promos: PromoT[] }>(LIST, {}, bearer(user.token));
        expect(read.body.data!.promos).toHaveLength(1);
        const res = await gql(
            CREATE_PROMO,
            {
                input: { code: 'X10', discountType: 'percent', value: 10, validFrom: '2030-01-01' },
            },
            bearer(user.token),
        );
        expect(res.body.errors?.[0].extensions?.code).toBe('FORBIDDEN');
    });
});
