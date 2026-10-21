import { env } from '../../../../core/config/env.js';
import { minutesOf, zonedParts, zonedTimeToUtc } from '../../../../shared/time.js';
import { ScheduleImpl, ScheduleOperations } from '../../../schedule/index.js';
import { REPORT_CURRENCY, UnpricedReason } from '../../db/_reports.enum.js';
import type {
    ClientSummary,
    Money,
    PromoSales,
    SalesBucket,
    SalesLine,
    SalesReport,
    SalesReportRequest,
    ServiceCount,
    ServiceSales,
    TherapistSales,
    TopClient,
    UnpricedBooking,
} from '../../db/_reports.types.js';
import * as ReportsOperations from '../../db/repository/index.js';
import { reportRange } from './reportRange.js';

const round2 = (n: number) => Math.round(n * 100) / 100;
const TOP_CLIENTS = 10;

const noMoney = (): Money => ({ grossRevenue: 0, discounts: 0, revenue: 0 });

/** Adds one booking's gross and discount (net = gross − discount) to a money total */
function addMoney(target: Money, gross: number, discount: number) {
    target.grossRevenue += gross;
    target.discounts += discount;
    target.revenue += gross - discount;
}

const roundMoney = <T extends Money>(m: T): T => ({
    ...m,
    grossRevenue: round2(m.grossRevenue),
    discounts: round2(m.discounts),
    revenue: round2(m.revenue),
});

/** Adds one booking to the line for (service, length, price), creating it on first use. */
function addToLine(
    lines: Map<string, SalesLine>,
    line: Pick<SalesLine, 'serviceId' | 'serviceName' | 'durationMin' | 'unitPrice'>,
    discount: number,
) {
    const key = `${line.serviceId}|${line.durationMin}|${line.unitPrice}`;
    const row = lines.get(key) ?? { ...line, bookings: 0, ...noMoney() };
    row.bookings += 1;
    addMoney(row, line.unitPrice, discount);
    lines.set(key, row);
}

const sortLines = (lines: Map<string, SalesLine>) =>
    [...lines.values()]
        .map(roundMoney)
        .sort(
            (a, b) =>
                a.serviceName.localeCompare(b.serviceName) ||
                a.durationMin - b.durationMin ||
                a.unitPrice - b.unitPrice,
        );

type TherapistRow = TherapistSales & {
    serviceMap: Map<string, ServiceCount>;
    lineMap: Map<string, SalesLine>;
};

const newTherapistRow = (therapistId: string, therapistName: string): TherapistRow => ({
    therapistId,
    therapistName,
    bookings: 0,
    minutes: 0,
    unpriced: 0,
    requested: 0,
    requestRate: 0,
    ...noMoney(),
    services: [],
    lines: [],
    serviceMap: new Map(),
    lineMap: new Map(),
});

/**
 * Sales for one day, week, month or year, in SCHEDULE_TIMEZONE.
 *
 * Each booking (counted on the day it starts) is priced by its service's rule that prevailed on
 * that day, for that weekday and length (ScheduleImpl.findServicePrice); its promo, if any,
 * takes its discount off that price (ScheduleImpl.promoDiscount). Both are looked up every
 * time the report runs, so a report for 2025 uses the 2025 prices. Promo terms can't change
 * once used, so discounts of past bookings never change.
 *
 * Money is reported as gross (prices), discounts, and revenue = net (what was charged).
 * Without `includeUpcoming`, only bookings that have ended by `now` count (services rendered).
 */
export async function buildSalesReport(
    { period, date, includeUpcoming }: SalesReportRequest,
    now = new Date(),
): Promise<SalesReport> {
    const tz = env.SCHEDULE_TIMEZONE;
    const range = reportRange(period, date, {
        opens: minutesOf(env.SCHEDULE_OPENING_TIME),
        closes: minutesOf(env.SCHEDULE_CLOSING_TIME),
    });
    const from = zonedTimeToUtc(range.from, 0, tz);
    const to = zonedTimeToUtc(range.toExclusive, 0, tz);

    const [bookings, roster, catalog, promoList, cancellations] = await Promise.all([
        ReportsOperations.findBookingsStartingBetween({
            from,
            to,
            endedBy: includeUpcoming ? undefined : now,
        }),
        ScheduleImpl.readTherapists(),
        ScheduleImpl.readServices({ includeArchived: true }),
        ScheduleOperations.readPromos({ includeArchived: true }),
        ReportsOperations.countCancellations({ from, to }),
    ]);

    // Rows start from the roster and the catalog, so therapists/services with no sales show 0
    const therapists = new Map<string, TherapistRow>(
        roster.map((t) => [String(t._id), newTherapistRow(String(t._id), t.name)]),
    );
    const therapistRow = (id: string) => {
        let row = therapists.get(id);
        if (!row) {
            // Bookings of a therapist removed from the roster since
            row = newTherapistRow(id, 'Removed therapist');
            therapists.set(id, row);
        }
        return row;
    };

    const servicesById = new Map(catalog.map((s) => [String(s._id), s]));
    const services = new Map<string, ServiceSales & { lineMap: Map<string, SalesLine> }>(
        catalog.map((s) => [
            String(s._id),
            {
                serviceId: String(s._id),
                serviceName: s.name,
                isActive: s.isActive,
                bookings: 0,
                minutes: 0,
                unpriced: 0,
                ...noMoney(),
                lines: [],
                lineMap: new Map(),
            },
        ]),
    );

    const promosById = new Map(promoList.map((p) => [String(p._id), p]));
    const promoSales = new Map<string, PromoSales>();

    const clientRows = new Map<string, TopClient>();
    let noClient = 0;

    const series = new Map<string, SalesBucket>(
        range.bucketKeys.map((key) => [key, { key, bookings: 0, revenue: 0 }]),
    );
    const totals = { bookings: 0, minutes: 0, unpriced: 0, requested: 0, online: 0, ...noMoney() };
    const unpriced: UnpricedBooking[] = [];

    for (const booking of bookings) {
        const local = zonedParts(booking.start, tz);
        const durationMin = Math.round((booking.end.getTime() - booking.start.getTime()) / 60_000);
        const therapist = therapistRow(String(booking.therapistId));
        const bucket = series.get(range.bucketOf(local.dateKey, local.minutes));

        totals.bookings += 1;
        totals.minutes += durationMin;
        therapist.bookings += 1;
        therapist.minutes += durationMin;
        if (booking.isRequested) {
            totals.requested += 1;
            therapist.requested += 1;
        }
        if (booking.source === 'client') totals.online += 1;
        if (bucket) bucket.bookings += 1;

        // Clients: bookings without one were made before clients existed
        const clientId = booking.clientId ? String(booking.clientId) : null;
        const client = clientId
            ? (clientRows.get(clientId) ?? {
                  clientId,
                  name: booking.client,
                  mobile: booking.clientMobile ?? '',
                  bookings: 0,
                  revenue: 0,
                  totalVisits: 0,
              })
            : null;
        if (client && clientId) {
            client.bookings += 1;
            clientRows.set(clientId, client);
        } else {
            noClient += 1;
        }

        // Promo usage counts even when the booking couldn't be priced
        const promo = booking.promoId ? promosById.get(String(booking.promoId)) : undefined;
        const promoRow = promo
            ? (promoSales.get(String(promo._id)) ?? {
                  promoId: String(promo._id),
                  code: promo.code,
                  bookings: 0,
                  discounts: 0,
              })
            : undefined;
        if (promo && promoRow) {
            promoRow.bookings += 1;
            promoSales.set(String(promo._id), promoRow);
        }

        const serviceId = booking.serviceId ? String(booking.serviceId) : null;
        const service = serviceId ? servicesById.get(serviceId) : undefined;
        const markUnpriced = (reason: UnpricedReason) => {
            totals.unpriced += 1;
            therapist.unpriced += 1;
            unpriced.push({
                bookingId: String(booking._id),
                client: booking.client,
                start: booking.start,
                durationMin,
                therapistName: therapist.therapistName,
                serviceName: service?.name ?? null,
                reason,
            });
        };

        if (!serviceId || !service) {
            markUnpriced(UnpricedReason.noService);
            continue;
        }

        // The service was rendered, priced or not
        const serviceRow = services.get(serviceId)!;
        serviceRow.bookings += 1;
        serviceRow.minutes += durationMin;
        const count = therapist.serviceMap.get(serviceId) ?? {
            serviceId,
            serviceName: service.name,
            bookings: 0,
            revenue: 0,
        };
        count.bookings += 1;
        therapist.serviceMap.set(serviceId, count);

        const price = ScheduleImpl.findServicePrice(service.prices, {
            dateKey: local.dateKey,
            weekday: local.weekday,
            durationMin,
        });
        if (!price) {
            serviceRow.unpriced += 1;
            markUnpriced(UnpricedReason.noPrice);
            continue;
        }

        const gross = price.amount;
        const discount = promo ? ScheduleImpl.promoDiscount(promo, gross) : 0;
        const net = gross - discount;
        addMoney(totals, gross, discount);
        addMoney(therapist, gross, discount);
        addMoney(serviceRow, gross, discount);
        count.revenue += net;
        if (bucket) bucket.revenue += net;
        if (client) client.revenue += net;
        if (promoRow) promoRow.discounts += discount;
        const line = { serviceId, serviceName: service.name, durationMin, unitPrice: gross };
        addToLine(therapist.lineMap, line, discount);
        addToLine(serviceRow.lineMap, line, discount);
    }

    return {
        period,
        from: range.from,
        to: range.to,
        timeZone: tz,
        currency: REPORT_CURRENCY,
        includeUpcoming,
        generatedAt: now,
        totals: roundMoney(totals),
        therapists: [...therapists.values()].map(({ serviceMap, lineMap, ...row }) => ({
            ...roundMoney(row),
            requestRate: row.bookings ? round2(row.requested / row.bookings) : 0,
            services: [...serviceMap.values()].map((c) => ({ ...c, revenue: round2(c.revenue) })),
            lines: sortLines(lineMap),
        })),
        services: [...services.values()]
            // Archived services only when they were booked in the period
            .filter((s) => s.isActive || s.bookings > 0)
            .map(({ lineMap, ...row }) => ({ ...roundMoney(row), lines: sortLines(lineMap) })),
        series: [...series.values()].map((b) => ({ ...b, revenue: round2(b.revenue) })),
        unpriced,
        promos: [...promoSales.values()]
            .map((p) => ({ ...p, discounts: round2(p.discounts) }))
            .sort((a, b) => b.bookings - a.bookings || a.code.localeCompare(b.code)),
        clients: await summarizeClients(clientRows, noClient, from, now),
        cancellations,
    };
}

/** New vs returning clients, and the top clients with their all-time visits. */
async function summarizeClients(
    rows: Map<string, TopClient>,
    noClient: number,
    periodStart: Date,
    now: Date,
): Promise<ClientSummary> {
    const ids = [...rows.keys()];
    const stats = ids.length
        ? await ScheduleOperations.clientBookingStats(ids, now)
        : new Map<string, { firstBooking: Date | null; visits: number }>();

    // New = their first booking ever is inside this period
    let newClients = 0;
    for (const id of ids) {
        const first = stats.get(id)?.firstBooking;
        if (!first || first >= periodStart) newClients += 1;
    }

    const top = [...rows.values()]
        .sort(
            (a, b) =>
                b.bookings - a.bookings || b.revenue - a.revenue || a.name.localeCompare(b.name),
        )
        .slice(0, TOP_CLIENTS)
        .map((c) => ({
            ...c,
            revenue: round2(c.revenue),
            totalVisits: stats.get(c.clientId)?.visits ?? 0,
        }));

    return {
        uniqueClients: ids.length,
        newClients,
        returningClients: ids.length - newClients,
        noClient,
        top,
    };
}
