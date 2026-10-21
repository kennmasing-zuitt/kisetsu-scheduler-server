import type { ReportPeriod, UnpricedReason } from './_reports.enum.js';

/** A booking as the report reads it (only the fields it needs) */
export interface ReportBooking {
    _id: unknown;
    client: string;
    clientId?: unknown;
    clientMobile?: string | null;
    therapistId: unknown;
    serviceId?: unknown;
    isRequested?: boolean;
    promoId?: unknown;
    /** staff or client (online); missing on old bookings = staff */
    source?: string | null;
    start: Date;
    end: Date;
}

export interface BookingWindow {
    /** Bookings starting at or after this instant ... */
    from: Date;
    /** ... and before this one */
    to: Date;
    /** When set, only bookings that have ended by then (services actually rendered) */
    endedBy?: Date;
}

/**
 * Money in a report: `grossRevenue` at the prevailing prices, `discounts` from promos, and
 * `revenue` = gross − discounts (net, what was actually charged).
 */
export interface Money {
    grossRevenue: number;
    discounts: number;
    revenue: number;
}

/** One (service, length, price) combination: shows which price was applied */
export interface SalesLine extends Money {
    serviceId: string;
    serviceName: string;
    durationMin: number;
    unitPrice: number;
    bookings: number;
}

export interface ServiceCount {
    serviceId: string;
    serviceName: string;
    bookings: number;
    revenue: number;
}

export interface TherapistSales extends Money {
    therapistId: string;
    therapistName: string;
    bookings: number;
    minutes: number;
    unpriced: number;
    /** Bookings where the client asked for this therapist by name */
    requested: number;
    /** requested / bookings (0 when there are none) */
    requestRate: number;
    /** Services rendered by this therapist (only those with at least one booking) */
    services: ServiceCount[];
    lines: SalesLine[];
}

export interface ServiceSales extends Money {
    serviceId: string;
    serviceName: string;
    isActive: boolean;
    bookings: number;
    minutes: number;
    unpriced: number;
    lines: SalesLine[];
}

export interface SalesBucket {
    /** "YYYY-MM-DDTHH" (daily: one bucket per hour), "YYYY-MM-DD" (weekly, monthly) or
     *  "YYYY-MM" (annual) */
    key: string;
    bookings: number;
    revenue: number;
}

export interface UnpricedBooking {
    bookingId: string;
    client: string;
    start: Date;
    durationMin: number;
    therapistName: string;
    serviceName: string | null;
    reason: UnpricedReason;
}

export interface SalesTotals extends Money {
    bookings: number;
    minutes: number;
    unpriced: number;
    /** Bookings where the client asked for the therapist by name */
    requested: number;
    /** Bookings the client made on the booking site */
    online: number;
}

/** Bookings due in the period that were cancelled instead */
export interface CancellationSummary {
    total: number;
    /** Cancelled by staff (e.g. the client called) */
    byStaff: number;
    /** Cancelled because the therapist became unavailable (client texted to rebook) */
    therapistUnavailable: number;
}

/** How often a promo code was used in the period and how much it gave away */
export interface PromoSales {
    promoId: string;
    code: string;
    bookings: number;
    discounts: number;
}

export interface TopClient {
    clientId: string;
    name: string;
    mobile: string;
    /** Bookings in the period */
    bookings: number;
    /** Net revenue in the period */
    revenue: number;
    /** Visits ever (ended bookings), to spot regulars */
    totalVisits: number;
}

export interface ClientSummary {
    /** Different clients (by mobile) with a booking in the period */
    uniqueClients: number;
    /** …whose first booking ever is in the period */
    newClients: number;
    /** …who had booked before the period */
    returningClients: number;
    /** Bookings without a client (made before clients existed) */
    noClient: number;
    /** Most bookings in the period first (up to 10) */
    top: TopClient[];
}

export interface SalesReport {
    period: ReportPeriod;
    /** First day, "YYYY-MM-DD" (inclusive) */
    from: string;
    /** Last day, "YYYY-MM-DD" (inclusive) */
    to: string;
    timeZone: string;
    currency: string;
    includeUpcoming: boolean;
    generatedAt: Date;
    totals: SalesTotals;
    therapists: TherapistSales[];
    services: ServiceSales[];
    series: SalesBucket[];
    unpriced: UnpricedBooking[];
    promos: PromoSales[];
    clients: ClientSummary;
    cancellations: CancellationSummary;
}

export interface SalesReportRequest {
    period: ReportPeriod;
    /** Any day inside the wanted week / month / year, "YYYY-MM-DD" */
    date: string;
    includeUpcoming: boolean;
}
