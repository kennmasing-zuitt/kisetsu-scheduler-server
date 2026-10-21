import { Types } from 'mongoose';
import { beforeEach, describe, expect, it } from 'vitest';
import { bearer, gql } from '../../../tests/graphql.helpers.js';
import { createAdmin, registerTestUser } from '../../auth/tests/auth.helpers.js';
import {
    BookingModel,
    ClientModel,
    DiscountType,
    PromoModel,
    RoomModel,
    ServiceModel,
    TherapistModel,
} from '../../schedule/index.js';

// Times are in the default SCHEDULE_TIMEZONE, Asia/Manila (UTC+8).
// 2025-12-29 is a Monday, so the week of 2026-01-01 runs Mon 2025-12-29 to Sun 2026-01-04.
const at = (date: string, time: string) => new Date(`${date}T${time}:00+08:00`);

const REPORT = `query ($period: ReportPeriod!, $date: String!, $includeUpcoming: Boolean) {
    salesReport(period: $period, date: $date, includeUpcoming: $includeUpcoming) {
        period from to currency includeUpcoming
        totals { bookings minutes revenue unpriced }
        therapists {
            therapistName bookings revenue unpriced
            services { serviceName bookings revenue }
            lines { serviceName durationMin unitPrice bookings revenue }
        }
        services { serviceName bookings revenue unpriced lines { durationMin unitPrice bookings } }
        series { key bookings revenue }
        unpriced { client serviceName reason }
    }
}`;

interface ReportT {
    period: string;
    from: string;
    to: string;
    currency: string;
    totals: { bookings: number; minutes: number; revenue: number; unpriced: number };
    therapists: {
        therapistName: string;
        bookings: number;
        revenue: number;
        unpriced: number;
        services: { serviceName: string; bookings: number; revenue: number }[];
        lines: { serviceName: string; durationMin: number; unitPrice: number; bookings: number }[];
    }[];
    services: { serviceName: string; bookings: number; revenue: number; unpriced: number }[];
    series: { key: string; bookings: number; revenue: number }[];
    unpriced: { client: string; serviceName: string | null; reason: string }[];
}

let admin = '';
let fuyu = '';

beforeEach(async () => {
    admin = (await createAdmin()).token;

    const ana = (await TherapistModel.create({ name: 'Ana' }))._id;
    const ben = (await TherapistModel.create({ name: 'Ben' }))._id;
    const room = (await RoomModel.create({ name: 'Room 1', color: '#534AB7' }))._id;

    // Fuyu got more expensive on 2026-01-01; Aki costs more Fri to Sun
    fuyu = String(
        (
            await ServiceModel.create({
                name: 'Fuyu',
                prices: [
                    {
                        durationMin: 60,
                        amount: 999,
                        validFrom: '2025-01-01',
                        validTo: '2025-12-31',
                    },
                    {
                        durationMin: 80,
                        amount: 1099,
                        validFrom: '2025-01-01',
                        validTo: '2025-12-31',
                    },
                    { durationMin: 60, amount: 1099, validFrom: '2026-01-01' },
                    { durationMin: 80, amount: 1199, validFrom: '2026-01-01' },
                ],
            })
        )._id,
    );
    const aki = (
        await ServiceModel.create({
            name: 'Aki',
            prices: [
                { days: [1, 2, 3, 4], amount: 699, validFrom: '2025-01-01' },
                { days: [0, 5, 6], amount: 799, validFrom: '2025-01-01' },
            ],
        })
    )._id;

    // Inserted directly: past bookings, and the report shouldn't depend on the booking rules
    const book = (
        client: string,
        therapistId: Types.ObjectId,
        serviceId: Types.ObjectId | string | undefined,
        start: Date,
        minutes: number,
    ) =>
        BookingModel.create({
            client,
            therapistId,
            roomId: room,
            serviceId,
            start,
            end: new Date(start.getTime() + minutes * 60_000),
        });
    await book('June', ana, fuyu, at('2025-06-10', '15:00'), 60); // 2025 price: 999
    await book('Monday', ana, fuyu, at('2025-12-29', '15:00'), 60); // 999
    // 00:30 on Jan 1st in Manila is still Dec 31st in UTC: it belongs to 2026 (price 1099)
    await book('New Year', ana, fuyu, at('2026-01-01', '00:30'), 60);
    await book('Friday 80', ana, fuyu, at('2026-01-02', '15:00'), 80); // 1199
    await book('Friday Aki', ben, aki, at('2026-01-02', '15:00'), 60); // Fri: 799
    await book('Monday Aki', ben, aki, at('2026-01-05', '15:00'), 90); // Mon: 699, any length
    await book('Legacy', ana, undefined, at('2026-01-05', '17:00'), 60); // no service
    await book('Odd length', ben, fuyu, at('2026-01-06', '15:00'), 90); // Fuyu has no 90
});

async function report(
    period: string,
    date: string,
    includeUpcoming?: boolean,
    token = admin,
): Promise<ReportT> {
    const res = await gql<{ salesReport: ReportT }>(
        REPORT,
        { period, date, includeUpcoming },
        bearer(token),
    );
    expect(res.body.errors).toBeUndefined();
    return res.body.data!.salesReport;
}

const therapist = (r: ReportT, name: string) => r.therapists.find((t) => t.therapistName === name)!;

describe('sales report', () => {
    it('daily: one day, charted per hour of opening hours', async () => {
        const r = await report('daily', '2026-01-02');
        expect(r).toMatchObject({ period: 'daily', from: '2026-01-02', to: '2026-01-02' });
        expect(r.totals).toMatchObject({ bookings: 2, revenue: 1199 + 799, unpriced: 0 });
        // Opening hours 10:00-22:00 -> 12 hourly buckets, 10:00 to 21:00
        expect(r.series.map((b: ReportT['series'][number]) => b.key)).toEqual(
            Array.from({ length: 12 }, (_, i) => `2026-01-02T${String(10 + i).padStart(2, '0')}`),
        );
        expect(r.series.find((b: ReportT['series'][number]) => b.key === '2026-01-02T15')).toEqual({
            key: '2026-01-02T15',
            bookings: 2,
            revenue: 1998,
        });
        expect(therapist(r, 'Ana').services).toEqual([
            { serviceName: 'Fuyu', bookings: 1, revenue: 1199 },
        ]);
    });

    it('daily: a booking outside opening hours still counts in the totals', async () => {
        // The New Year booking starts at 00:30
        const r = await report('daily', '2026-01-01');
        expect(r.totals).toMatchObject({ bookings: 1, revenue: 1099 });
        expect(
            r.series.reduce((sum: number, b: ReportT['series'][number]) => sum + b.bookings, 0),
        ).toBe(0);
    });

    it('weekly: Monday to Sunday, each booking at the price of its own date', async () => {
        const r = await report('weekly', '2026-01-01');
        expect(r).toMatchObject({
            period: 'weekly',
            from: '2025-12-29',
            to: '2026-01-04',
            currency: 'PHP',
        });
        expect(r.totals).toEqual({
            bookings: 4,
            minutes: 260,
            revenue: 999 + 1099 + 1199 + 799,
            unpriced: 0,
        });

        const ana = therapist(r, 'Ana');
        expect(ana.services).toEqual([{ serviceName: 'Fuyu', bookings: 3, revenue: 3297 }]);
        // Fuyu 60 shows twice: at the 2025 price and at the 2026 price
        expect(ana.lines.map((l) => [l.durationMin, l.unitPrice, l.bookings])).toEqual([
            [60, 999, 1],
            [60, 1099, 1],
            [80, 1199, 1],
        ]);
        expect(therapist(r, 'Ben').services).toEqual([
            { serviceName: 'Aki', bookings: 1, revenue: 799 },
        ]);

        expect(r.series.map((b) => b.key)).toEqual([
            '2025-12-29',
            '2025-12-30',
            '2025-12-31',
            '2026-01-01',
            '2026-01-02',
            '2026-01-03',
            '2026-01-04',
        ]);
        expect(r.series[3]).toEqual({ key: '2026-01-01', bookings: 1, revenue: 1099 });
    });

    it('monthly: weekday prices, and bookings that could not be priced', async () => {
        const r = await report('monthly', '2026-01-15');
        expect(r).toMatchObject({ from: '2026-01-01', to: '2026-01-31' });
        expect(r.series).toHaveLength(31);
        expect(r.totals).toMatchObject({
            bookings: 6,
            revenue: 1099 + 1199 + 799 + 699,
            unpriced: 2,
        });

        // Services rendered per therapist: Ben's 90-minute Fuyu counts, but adds no revenue
        expect(therapist(r, 'Ben').services).toEqual([
            { serviceName: 'Aki', bookings: 2, revenue: 1498 },
            { serviceName: 'Fuyu', bookings: 1, revenue: 0 },
        ]);
        expect(therapist(r, 'Ana')).toMatchObject({ bookings: 3, unpriced: 1 });
        expect(r.unpriced).toEqual([
            { client: 'Legacy', serviceName: null, reason: 'noService' },
            { client: 'Odd length', serviceName: 'Fuyu', reason: 'noPrice' },
        ]);
        expect(r.services.find((s) => s.serviceName === 'Fuyu')).toMatchObject({
            bookings: 3,
            unpriced: 1,
        });
    });

    it('annual: by month, and re-priced retroactively when an old period is corrected', async () => {
        const r = await report('annual', '2025-03-01');
        expect(r).toMatchObject({ from: '2025-01-01', to: '2025-12-31' });
        expect(r.totals).toMatchObject({ bookings: 2, revenue: 1998 }); // New Year's booking is 2026
        expect(r.series).toHaveLength(12);
        expect(r.series.find((b: ReportT['series'][number]) => b.key === '2025-06')).toEqual({
            key: '2025-06',
            bookings: 1,
            revenue: 999,
        });

        // Correct the 2025 price of a 60-minute Fuyu: past reports follow
        await ServiceModel.updateOne({ _id: fuyu }, { $set: { 'prices.0.amount': 950 } });
        const corrected = await report('annual', '2025-03-01');
        expect(corrected.totals.revenue).toBe(1900);
        // ... while 2026 keeps its own price
        expect((await report('annual', '2026-05-01')).totals.revenue).toBe(1099 + 1199 + 799 + 699);
    });

    it('counts upcoming bookings only when asked', async () => {
        const start = new Date(Date.now() + 2 * 3_600_000); // in two hours
        await BookingModel.create({
            client: 'Later',
            therapistId: (await TherapistModel.findOne({ name: 'Ana' }))!._id,
            roomId: (await RoomModel.findOne())!._id,
            serviceId: fuyu,
            start,
            end: new Date(start.getTime() + 60 * 60_000),
        });
        const day = start.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

        expect((await report('weekly', day)).totals.bookings).toBe(0);
        expect((await report('weekly', day, true)).totals).toMatchObject({
            bookings: 1,
            revenue: 1099,
        });
    });

    it('lists every roster therapist and active service, even with no sales', async () => {
        const r = await report('weekly', '2030-01-07');
        expect(r.totals.bookings).toBe(0);
        expect(r.therapists.map((t) => t.therapistName)).toEqual(['Ana', 'Ben']);
        expect(r.services.map((s: ReportT['services'][number]) => s.serviceName)).toEqual([
            'Aki',
            'Fuyu',
        ]);
    });

    it('needs readReports, and a valid date', async () => {
        const user = await registerTestUser({ email: 'desk@example.com' });
        const res = await gql(REPORT, { period: 'weekly', date: '2026-01-01' }, bearer(user.token));
        expect(res.body.errors?.[0]).toMatchObject({
            message: 'Missing permission: readReports',
            extensions: { code: 'FORBIDDEN' },
        });

        const bad = await gql(REPORT, { period: 'weekly', date: '2026-02-30' }, bearer(admin));
        expect(bad.body.errors?.[0].extensions?.code).toBe('VALIDATION_ERROR');
    });
});

interface MoneyT {
    grossRevenue: number;
    discounts: number;
    revenue: number;
}
interface MoneyReportT {
    totals: MoneyT & { bookings: number; requested: number };
    therapists: (MoneyT & {
        therapistName: string;
        bookings: number;
        requested: number;
        requestRate: number;
        lines: (MoneyT & { durationMin: number; unitPrice: number; bookings: number })[];
    })[];
    series: { key: string; revenue: number }[];
    promos: { code: string; bookings: number; discounts: number }[];
    clients: { noClient: number } & Record<string, unknown>;
}

const MONEY_REPORT = `query ($date: String!) {
    salesReport(period: weekly, date: $date) {
        totals { bookings grossRevenue discounts revenue requested }
        therapists {
            therapistName bookings requested requestRate grossRevenue discounts revenue
            lines { durationMin unitPrice bookings grossRevenue discounts revenue }
        }
        series { key revenue }
        promos { code bookings discounts }
        clients { uniqueClients newClients returningClients noClient top { name mobile bookings revenue totalVisits } }
    }
}`;

describe('sales report: promos, requests and clients', () => {
    it('net revenue = gross − promo discounts; request rates; new vs returning clients', async () => {
        const anaId = (await TherapistModel.findOne({ name: 'Ana' }))!._id;
        const benId = (await TherapistModel.findOne({ name: 'Ben' }))!._id;
        const roomId = (await RoomModel.findOne())!._id;
        const aki = (await ServiceModel.findOne({ name: 'Aki' }))!._id;
        const pct10 = await PromoModel.create({
            code: 'PCT10',
            discountType: DiscountType.percent,
            value: 10,
            validFrom: '2026-01-01',
        });
        const off200 = await PromoModel.create({
            code: 'PHP200',
            discountType: DiscountType.amount,
            value: 200,
            validFrom: '2026-01-01',
        });
        const juan = await ClientModel.create({ mobile: '+639171111111', firstName: 'Juan' });
        const maria = await ClientModel.create({ mobile: '+639182222222', firstName: 'Maria' });

        const book = (
            client: typeof juan,
            therapistId: Types.ObjectId,
            serviceId: Types.ObjectId | string,
            start: Date,
            minutes: number,
            extra: Record<string, unknown> = {},
        ) =>
            BookingModel.create({
                client: client.firstName,
                clientId: client._id,
                clientMobile: client.mobile,
                therapistId,
                roomId,
                serviceId,
                start,
                end: new Date(start.getTime() + minutes * 60_000),
                ...extra,
            });
        // Juan came once before (so he's returning); the week of 2026-02-02 (Mon) to 02-08:
        await book(juan, anaId, fuyu, at('2025-06-11', '15:00'), 60);
        await book(juan, anaId, fuyu, at('2026-02-02', '15:00'), 60, {
            isRequested: true,
            promoId: pct10._id,
            promoCode: 'PCT10',
        }); // 1099 − 109.90
        await book(maria, anaId, fuyu, at('2026-02-03', '15:00'), 80, {
            promoId: off200._id,
            promoCode: 'PHP200',
        }); // 1199 − 200
        await book(juan, benId, aki, at('2026-02-04', '15:00'), 60); // Wed: 699

        const res = await gql<{ salesReport: MoneyReportT }>(
            MONEY_REPORT,
            { date: '2026-02-04' },
            bearer(admin),
        );
        expect(res.body.errors).toBeUndefined();
        const r: MoneyReportT = res.body.data!.salesReport;

        expect(r.totals).toEqual({
            bookings: 3,
            grossRevenue: 2997,
            discounts: 309.9,
            revenue: 2687.1,
            requested: 1,
        });
        const ana = r.therapists.find((t) => t.therapistName === 'Ana')!;
        expect(ana).toMatchObject({
            bookings: 2,
            requested: 1,
            requestRate: 0.5,
            grossRevenue: 2298,
            discounts: 309.9,
            revenue: 1988.1,
        });
        expect(ana.lines[0]).toEqual({
            durationMin: 60,
            unitPrice: 1099,
            bookings: 1,
            grossRevenue: 1099,
            discounts: 109.9,
            revenue: 989.1,
        });
        // The chart shows net revenue
        expect(r.series.find((b) => b.key === '2026-02-02')!.revenue).toBe(989.1);
        expect(r.promos).toEqual([
            { code: 'PCT10', bookings: 1, discounts: 109.9 },
            { code: 'PHP200', bookings: 1, discounts: 200 },
        ]);
        expect(r.clients).toEqual({
            uniqueClients: 2,
            newClients: 1,
            returningClients: 1,
            noClient: 0,
            top: [
                {
                    name: 'Juan',
                    mobile: '+639171111111',
                    bookings: 2,
                    revenue: 1688.1,
                    totalVisits: 3,
                },
                {
                    name: 'Maria',
                    mobile: '+639182222222',
                    bookings: 1,
                    revenue: 999,
                    totalVisits: 1,
                },
            ],
        });
    });

    it('a fixed discount never takes a booking below zero', async () => {
        const anaId = (await TherapistModel.findOne({ name: 'Ana' }))!._id;
        const big = await PromoModel.create({
            code: 'FREE5000',
            discountType: DiscountType.amount,
            value: 5000,
            validFrom: '2026-01-01',
        });
        await BookingModel.create({
            client: 'Lucky',
            therapistId: anaId,
            roomId: (await RoomModel.findOne())!._id,
            serviceId: fuyu,
            promoId: big._id,
            start: at('2026-02-10', '15:00'),
            end: at('2026-02-10', '16:00'),
        });
        const res = await gql<{ salesReport: MoneyReportT }>(
            MONEY_REPORT,
            { date: '2026-02-10' },
            bearer(admin),
        );
        expect(res.body.data!.salesReport.totals).toMatchObject({
            grossRevenue: 1099,
            discounts: 1099,
            revenue: 0,
        });
        expect(res.body.data!.salesReport.clients.noClient).toBe(1);
    });
});
