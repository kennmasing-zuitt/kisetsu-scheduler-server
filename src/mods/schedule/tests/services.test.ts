import { beforeEach, describe, expect, it } from 'vitest';
import { bearer, gql } from '../../../tests/graphql.helpers.js';
import { createAdmin, registerTestUser } from '../../auth/tests/auth.helpers.js';
import { BookingModel, RoomModel, TherapistModel } from '../index.js';

const PRICE = 'id durationMin days amount validFrom validTo';
const FIELDS = `id name description isActive prices { ${PRICE} }`;
const CREATE = `mutation ($input: CreateServiceInput!) { createService(input: $input) { ${FIELDS} } }`;
const UPDATE = `mutation ($id: ID!, $input: UpdateServiceInput!) {
    updateService(id: $id, input: $input) { ${FIELDS} }
}`;
const DELETE = `mutation ($id: ID!) { deleteService(id: $id) }`;
const LIST = `query ($includeArchived: Boolean) { services(includeArchived: $includeArchived) { ${FIELDS} } }`;

interface PriceT {
    durationMin: number | null;
    days: number[];
    amount: number;
    validFrom: string;
    validTo: string | null;
}
interface ServiceT {
    id: string;
    name: string;
    isActive: boolean;
    prices: PriceT[];
}

// Managing services needs createService / updateService / deleteService (super admin here)
let admin = '';
beforeEach(async () => {
    admin = (await createAdmin()).token;
});

const FUYU_PRICES = [
    { durationMin: 80, amount: 1199, validFrom: '2026-01-01' },
    { durationMin: 60, amount: 1099, validFrom: '2026-01-01' },
];

async function create(
    name: string,
    prices: unknown[] = FUYU_PRICES,
    extra = {},
): Promise<ServiceT> {
    const res = await gql<{ createService: ServiceT }>(
        CREATE,
        { input: { name, prices, ...extra } },
        bearer(admin),
    );
    expect(res.body.errors).toBeUndefined();
    return res.body.data!.createService;
}

const errorOf = (res: {
    body: { errors?: { message: string; extensions?: { code?: string } }[] };
}) => res.body.errors?.[0];

describe('services module', () => {
    it('createService stores the price list sorted, with defaults filled in', async () => {
        const s = await create(' Fuyu ');
        expect(s.name).toBe('Fuyu');
        expect(s.isActive).toBe(true);
        expect(s.prices).toEqual([
            expect.objectContaining({ durationMin: 60, days: [], amount: 1099, validTo: null }),
            expect.objectContaining({ durationMin: 80, days: [], amount: 1199, validTo: null }),
        ]);
    });

    it('accepts weekday prices for any length (Aki) and stores all 7 days as "every day"', async () => {
        const aki = await create('Aki', [
            { days: [1, 2, 3, 4], amount: 699, validFrom: '2026-01-01' },
            { days: [5, 6, 0], amount: 799, validFrom: '2026-01-01' },
        ]);
        expect(aki.prices.map((p) => [p.durationMin, p.days, p.amount])).toEqual([
            [null, [1, 2, 3, 4], 699],
            [null, [0, 5, 6], 799],
        ]);

        const everyDay = await create('Shiki', [
            {
                durationMin: 120,
                days: [0, 1, 2, 3, 4, 5, 6],
                amount: 2499,
                validFrom: '2026-01-01',
            },
        ]);
        expect(everyDay.prices[0].days).toEqual([]);
    });

    it('accepts consecutive price periods but rejects overlapping ones', async () => {
        const ok = await create('Natsu', [
            { durationMin: 60, amount: 1199, validFrom: '2025-01-01', validTo: '2025-12-31' },
            { durationMin: 60, amount: 1299, validFrom: '2026-01-01' },
        ]);
        expect(ok.prices).toHaveLength(2);

        const overlap = await gql(
            CREATE,
            {
                input: {
                    name: 'Haru',
                    prices: [
                        {
                            durationMin: 80,
                            amount: 1499,
                            validFrom: '2025-01-01',
                            validTo: '2026-03-31',
                        },
                        { durationMin: 80, amount: 1599, validFrom: '2026-01-01' },
                    ],
                },
            },
            bearer(admin),
        );
        expect(errorOf(overlap)?.extensions?.code).toBe('VALIDATION_ERROR');

        // An "any length" price overlaps every specific length in the same period
        const anyLength = await gql(
            CREATE,
            {
                input: {
                    name: 'Mixed',
                    prices: [
                        { amount: 500, validFrom: '2026-01-01' },
                        { durationMin: 60, amount: 600, validFrom: '2026-01-01' },
                    ],
                },
            },
            bearer(admin),
        );
        expect(errorOf(anyLength)?.extensions?.code).toBe('VALIDATION_ERROR');
    });

    it('rejects bad prices and periods', async () => {
        const bad = (price: object) =>
            gql(CREATE, { input: { name: 'X', prices: [price] } }, bearer(admin));
        const base = { durationMin: 60, amount: 100, validFrom: '2026-01-01' };
        for (const price of [
            { ...base, amount: 0 },
            { ...base, amount: 10.005 },
            { ...base, validFrom: '2026-13-01' },
            { ...base, validTo: '2025-12-31' },
            { ...base, days: [7] },
        ]) {
            expect(errorOf(await bad(price))?.extensions?.code).toBe('VALIDATION_ERROR');
        }
    });

    it('names are unique, ignoring case', async () => {
        await create('Fuyu');
        const res = await gql(CREATE, { input: { name: 'FUYU', prices: [] } }, bearer(admin));
        expect(errorOf(res)?.extensions?.code).toBe('SERVICE_NAME_TAKEN');
    });

    it('updateService replaces the price list; archived services are hidden by default', async () => {
        const s = await create('Fuyu');
        const res = await gql<{ updateService: ServiceT }>(
            UPDATE,
            {
                id: s.id,
                input: {
                    isActive: false,
                    prices: [{ durationMin: 60, amount: 1150, validFrom: '2026-01-01' }],
                },
            },
            bearer(admin),
        );
        expect(res.body.errors).toBeUndefined();
        expect(res.body.data!.updateService.prices).toHaveLength(1);

        const active = await gql<{ services: ServiceT[] }>(LIST, {}, bearer(admin));
        expect(active.body.data!.services).toHaveLength(0);
        const all = await gql<{ services: ServiceT[] }>(
            LIST,
            { includeArchived: true },
            bearer(admin),
        );
        expect(all.body.data!.services.map((x: ServiceT) => x.name)).toEqual(['Fuyu']);
    });

    it('deleteService is refused once a booking uses the service', async () => {
        const used = await create('Fuyu');
        const unused = await create('Natsu');
        await BookingModel.create({
            client: 'C',
            therapistId: (await TherapistModel.create({ name: 'T' }))._id,
            roomId: (await RoomModel.create({ name: 'R', color: '#000000' }))._id,
            serviceId: used.id,
            start: new Date('2026-01-05T07:00:00Z'),
            end: new Date('2026-01-05T08:00:00Z'),
        });

        const refused = await gql(DELETE, { id: used.id }, bearer(admin));
        expect(errorOf(refused)?.extensions?.code).toBe('SERVICE_IN_USE');

        const ok = await gql<{ deleteService: boolean }>(DELETE, { id: unused.id }, bearer(admin));
        expect(ok.body.data?.deleteService).toBe(true);
    });

    it('the default user role can read services but not manage them', async () => {
        await create('Fuyu');
        const user = await registerTestUser({ email: 'desk@example.com' });
        const read = await gql<{ services: ServiceT[] }>(LIST, {}, bearer(user.token));
        expect(read.body.data!.services).toHaveLength(1);

        const res = await gql(CREATE, { input: { name: 'X', prices: [] } }, bearer(user.token));
        expect(errorOf(res)?.extensions?.code).toBe('FORBIDDEN');
    });
});
