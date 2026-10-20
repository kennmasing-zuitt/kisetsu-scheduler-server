import { env } from '../../../../core/config/env.js';
import { zonedParts, zonedTimeToUtc } from '../../../../shared/time.js';
import { ScheduleImpl } from '../../../schedule/index.js';
import { REPORT_CURRENCY, UnpricedReason } from '../../db/_reports.enum.js';
import type {
    SalesBucket,
    SalesLine,
    SalesReport,
    SalesReportRequest,
    ServiceCount,
    ServiceSales,
    TherapistSales,
    UnpricedBooking,
} from '../../db/_reports.types.js';
import * as ReportsOperations from '../../db/repository/index.js';
import { reportRange } from './reportRange.js';

const round2 = (n: number) => Math.round(n * 100) / 100;

const emptyLine = (
    serviceId: string,
    serviceName: string,
    durationMin: number,
    unitPrice: number,
): SalesLine => ({
    serviceId,
    serviceName,
    durationMin,
    unitPrice,
    bookings: 0,
    revenue: 0,
});

/** Adds one booking to the line for (service, length, price), creating it on first use. */
function addToLine(
    lines: Map<string, SalesLine>,
    serviceId: string,
    serviceName: string,
    durationMin: number,
    unitPrice: number,
) {
    const key = `${serviceId}|${durationMin}|${unitPrice}`;
    const line = lines.get(key) ?? emptyLine(serviceId, serviceName, durationMin, unitPrice);
    line.bookings += 1;
    line.revenue += unitPrice;
    lines.set(key, line);
}

const sortLines = (lines: Map<string, SalesLine>) =>
    [...lines.values()]
        .map((l) => ({ ...l, revenue: round2(l.revenue) }))
        .sort(
            (a, b) =>
                a.serviceName.localeCompare(b.serviceName) ||
                a.durationMin - b.durationMin ||
                a.unitPrice - b.unitPrice,
        );

/**
 * Sales for one week, month or year, in SCHEDULE_TIMEZONE.
 *
 * Each booking (counted on the day it starts) is priced by its service's rule that prevailed on
 * that day, for that weekday and length (ScheduleImpl.findServicePrice). Prices are looked up
 * every time the report runs, so a report for 2025 uses the 2025 prices even after they change,
 * and correcting an old price period corrects old reports.
 *
 * Without `includeUpcoming`, only bookings that have ended by `now` count (services actually
 * rendered); with it, bookings later in the period are included too.
 */
export async function buildSalesReport(
    { period, date, includeUpcoming }: SalesReportRequest,
    now = new Date(),
): Promise<SalesReport> {
    const tz = env.SCHEDULE_TIMEZONE;
    const range = reportRange(period, date);

    const [bookings, roster, catalog] = await Promise.all([
        ReportsOperations.findBookingsStartingBetween({
            from: zonedTimeToUtc(range.from, 0, tz),
            to: zonedTimeToUtc(range.toExclusive, 0, tz),
            endedBy: includeUpcoming ? undefined : now,
        }),
        ScheduleImpl.readTherapists(),
        ScheduleImpl.readServices({ includeArchived: true }),
    ]);

    // Rows start from the roster and the catalog, so therapists/services with no sales show 0
    const therapists = new Map<
        string,
        TherapistSales & { serviceMap: Map<string, ServiceCount>; lineMap: Map<string, SalesLine> }
    >();
    for (const t of roster) {
        therapists.set(String(t._id), {
            therapistId: String(t._id),
            therapistName: t.name,
            bookings: 0,
            minutes: 0,
            revenue: 0,
            unpriced: 0,
            services: [],
            lines: [],
            serviceMap: new Map(),
            lineMap: new Map(),
        });
    }
    const therapistRow = (id: string) => {
        let row = therapists.get(id);
        if (!row) {
            // Bookings of a therapist removed from the roster since
            row = {
                therapistId: id,
                therapistName: 'Removed therapist',
                bookings: 0,
                minutes: 0,
                revenue: 0,
                unpriced: 0,
                services: [],
                lines: [],
                serviceMap: new Map(),
                lineMap: new Map(),
            };
            therapists.set(id, row);
        }
        return row;
    };

    const servicesById = new Map(catalog.map((s) => [String(s._id), s]));
    const services = new Map<string, ServiceSales & { lineMap: Map<string, SalesLine> }>();
    for (const s of catalog) {
        services.set(String(s._id), {
            serviceId: String(s._id),
            serviceName: s.name,
            isActive: s.isActive,
            bookings: 0,
            minutes: 0,
            revenue: 0,
            unpriced: 0,
            lines: [],
            lineMap: new Map(),
        });
    }

    const series = new Map<string, SalesBucket>(
        range.bucketKeys.map((key) => [key, { key, bookings: 0, revenue: 0 }]),
    );
    const totals = { bookings: 0, minutes: 0, revenue: 0, unpriced: 0 };
    const unpriced: UnpricedBooking[] = [];

    for (const booking of bookings) {
        const local = zonedParts(booking.start, tz);
        const durationMin = Math.round((booking.end.getTime() - booking.start.getTime()) / 60_000);
        const therapist = therapistRow(String(booking.therapistId));
        const bucket = series.get(range.bucketOf(local.dateKey));

        totals.bookings += 1;
        totals.minutes += durationMin;
        therapist.bookings += 1;
        therapist.minutes += durationMin;
        if (bucket) bucket.bookings += 1;

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

        const amount = price.amount;
        totals.revenue += amount;
        therapist.revenue += amount;
        count.revenue += amount;
        serviceRow.revenue += amount;
        if (bucket) bucket.revenue += amount;
        addToLine(therapist.lineMap, serviceId, service.name, durationMin, amount);
        addToLine(serviceRow.lineMap, serviceId, service.name, durationMin, amount);
    }

    return {
        period,
        from: range.from,
        to: range.to,
        timeZone: tz,
        currency: REPORT_CURRENCY,
        includeUpcoming,
        generatedAt: now,
        totals: { ...totals, revenue: round2(totals.revenue) },
        therapists: [...therapists.values()]
            // Removed therapists only appear when they had bookings in the period
            .map(({ serviceMap, lineMap, ...row }) => ({
                ...row,
                revenue: round2(row.revenue),
                services: [...serviceMap.values()].map((c) => ({
                    ...c,
                    revenue: round2(c.revenue),
                })),
                lines: sortLines(lineMap),
            })),
        services: [...services.values()]
            // Archived services only when they were booked in the period
            .filter((s) => s.isActive || s.bookings > 0)
            .map(({ lineMap, ...row }) => ({
                ...row,
                revenue: round2(row.revenue),
                lines: sortLines(lineMap),
            })),
        series: [...series.values()].map((b) => ({ ...b, revenue: round2(b.revenue) })),
        unpriced,
    };
}
