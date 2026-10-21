import type { ReportPeriod, UnpricedReason } from './_reports.enum.js';

/** A booking as the report reads it (only the fields it needs) */
export interface ReportBooking {
    _id: unknown;
    client: string;
    therapistId: unknown;
    serviceId?: unknown;
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

/** One (service, length, price) combination: shows which price was applied */
export interface SalesLine {
    serviceId: string;
    serviceName: string;
    durationMin: number;
    unitPrice: number;
    bookings: number;
    revenue: number;
}

export interface ServiceCount {
    serviceId: string;
    serviceName: string;
    bookings: number;
    revenue: number;
}

export interface TherapistSales {
    therapistId: string;
    therapistName: string;
    bookings: number;
    minutes: number;
    revenue: number;
    unpriced: number;
    /** Services rendered by this therapist (only those with at least one booking) */
    services: ServiceCount[];
    lines: SalesLine[];
}

export interface ServiceSales {
    serviceId: string;
    serviceName: string;
    isActive: boolean;
    bookings: number;
    minutes: number;
    revenue: number;
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

export interface SalesTotals {
    bookings: number;
    minutes: number;
    revenue: number;
    unpriced: number;
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
}

export interface SalesReportRequest {
    period: ReportPeriod;
    /** Any day inside the wanted week / month / year, "YYYY-MM-DD" */
    date: string;
    includeUpcoming: boolean;
}
