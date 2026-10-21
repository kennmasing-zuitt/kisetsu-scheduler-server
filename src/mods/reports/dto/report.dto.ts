import { ArgsType, Field, Float, ID, Int, ObjectType, registerEnumType } from 'type-graphql';
import { ReportPeriod, UnpricedReason } from '../db/_reports.enum.js';

// GraphQL shapes (what clients see). Validation rules live in db/report.zod.ts

registerEnumType(ReportPeriod, {
    name: 'ReportPeriod',
    description:
        'daily (charted per hour); weekly = Monday to Sunday; monthly; annual. ' +
        'Dates in SCHEDULE_TIMEZONE',
});
registerEnumType(UnpricedReason, {
    name: 'UnpricedReason',
    description: 'noService = booking has no service; noPrice = no price rule for its date/length',
});

@ArgsType()
export class SalesReportArgsType {
    @Field(() => ReportPeriod)
    period!: ReportPeriod;

    @Field(() => String, {
        description: 'The day, or any day in the wanted week / month / year, "YYYY-MM-DD"',
    })
    date!: string;

    @Field(() => Boolean, {
        defaultValue: false,
        description: 'Also count bookings that have not ended yet (default: only rendered ones)',
    })
    includeUpcoming!: boolean;
}

@ObjectType('SalesLine', { description: 'Bookings of one service, at one length and one price' })
export class SalesLineObject {
    @Field(() => ID)
    serviceId!: string;

    @Field(() => String)
    serviceName!: string;

    @Field(() => Int)
    durationMin!: number;

    @Field(() => Float, { description: 'The price that prevailed on those bookings’ dates' })
    unitPrice!: number;

    @Field(() => Int)
    bookings!: number;

    @Field(() => Float, { description: 'unitPrice × bookings' })
    grossRevenue!: number;

    @Field(() => Float, { description: 'Promo discounts' })
    discounts!: number;

    @Field(() => Float, { description: 'Net: grossRevenue − discounts' })
    revenue!: number;
}

@ObjectType('ServiceCount', { description: 'How many times a therapist rendered a service' })
export class ServiceCountObject {
    @Field(() => ID)
    serviceId!: string;

    @Field(() => String)
    serviceName!: string;

    @Field(() => Int)
    bookings!: number;

    @Field(() => Float)
    revenue!: number;
}

@ObjectType('TherapistSales')
export class TherapistSalesObject {
    @Field(() => ID)
    therapistId!: string;

    @Field(() => String)
    therapistName!: string;

    @Field(() => Int)
    bookings!: number;

    @Field(() => Int)
    minutes!: number;

    @Field(() => Float, { description: 'At the prevailing prices' })
    grossRevenue!: number;

    @Field(() => Float, { description: 'Promo discounts' })
    discounts!: number;

    @Field(() => Float, { description: 'Net: grossRevenue − discounts' })
    revenue!: number;

    @Field(() => Int, { description: 'Bookings that added no revenue (see SalesReport.unpriced)' })
    unpriced!: number;

    @Field(() => Int, { description: 'Bookings where the client asked for this therapist by name' })
    requested!: number;

    @Field(() => Float, { description: 'requested / bookings, 0–1' })
    requestRate!: number;

    @Field(() => [ServiceCountObject], { description: 'Only services with at least one booking' })
    services!: ServiceCountObject[];

    @Field(() => [SalesLineObject])
    lines!: SalesLineObject[];
}

@ObjectType('ServiceSales')
export class ServiceSalesObject {
    @Field(() => ID)
    serviceId!: string;

    @Field(() => String)
    serviceName!: string;

    @Field(() => Boolean)
    isActive!: boolean;

    @Field(() => Int)
    bookings!: number;

    @Field(() => Int)
    minutes!: number;

    @Field(() => Float)
    grossRevenue!: number;

    @Field(() => Float)
    discounts!: number;

    @Field(() => Float, { description: 'Net: grossRevenue − discounts' })
    revenue!: number;

    @Field(() => Int)
    unpriced!: number;

    @Field(() => [SalesLineObject])
    lines!: SalesLineObject[];
}

@ObjectType('SalesBucket', {
    description: 'One hour (daily), day (weekly/monthly) or month (annual) of the chart',
})
export class SalesBucketObject {
    @Field(() => String, {
        description:
            '"YYYY-MM-DDTHH" (daily), "YYYY-MM-DD" (weekly, monthly) or "YYYY-MM" (annual)',
    })
    key!: string;

    @Field(() => Int)
    bookings!: number;

    @Field(() => Float)
    revenue!: number;
}

@ObjectType('UnpricedBooking')
export class UnpricedBookingObject {
    @Field(() => ID)
    bookingId!: string;

    @Field(() => String)
    client!: string;

    @Field(() => Date)
    start!: Date;

    @Field(() => Int)
    durationMin!: number;

    @Field(() => String)
    therapistName!: string;

    @Field(() => String, { nullable: true })
    serviceName!: string | null;

    @Field(() => UnpricedReason)
    reason!: UnpricedReason;
}

@ObjectType('SalesTotals')
export class SalesTotalsObject {
    @Field(() => Int, { description: 'Services rendered (bookings)' })
    bookings!: number;

    @Field(() => Int)
    minutes!: number;

    @Field(() => Float, { description: 'At the prevailing prices' })
    grossRevenue!: number;

    @Field(() => Float, { description: 'Promo discounts' })
    discounts!: number;

    @Field(() => Float, { description: 'Net: grossRevenue − discounts (what was charged)' })
    revenue!: number;

    @Field(() => Int)
    unpriced!: number;

    @Field(() => Int, { description: 'Bookings where the client asked for the therapist by name' })
    requested!: number;
}

@ObjectType('PromoSales', { description: 'A promo code used in the period' })
export class PromoSalesObject {
    @Field(() => ID)
    promoId!: string;

    @Field(() => String)
    code!: string;

    @Field(() => Int)
    bookings!: number;

    @Field(() => Float, { description: 'Total discount given' })
    discounts!: number;
}

@ObjectType('TopClient')
export class TopClientObject {
    @Field(() => ID)
    clientId!: string;

    @Field(() => String)
    name!: string;

    @Field(() => String)
    mobile!: string;

    @Field(() => Int, { description: 'Bookings in the period' })
    bookings!: number;

    @Field(() => Float, { description: 'Net revenue in the period' })
    revenue!: number;

    @Field(() => Int, { description: 'Visits ever (ended bookings)' })
    totalVisits!: number;
}

@ObjectType('ClientSummary')
export class ClientSummaryObject {
    @Field(() => Int, { description: 'Different clients (by mobile) in the period' })
    uniqueClients!: number;

    @Field(() => Int, { description: 'Whose first booking ever is in the period' })
    newClients!: number;

    @Field(() => Int, { description: 'Who had booked before the period' })
    returningClients!: number;

    @Field(() => Int, { description: 'Bookings without a client (made before clients existed)' })
    noClient!: number;

    @Field(() => [TopClientObject], { description: 'Most bookings in the period first (up to 10)' })
    top!: TopClientObject[];
}

@ObjectType('SalesReport')
export class SalesReportObject {
    @Field(() => ReportPeriod)
    period!: ReportPeriod;

    @Field(() => String, { description: 'First day, "YYYY-MM-DD"' })
    from!: string;

    @Field(() => String, { description: 'Last day, "YYYY-MM-DD" (inclusive)' })
    to!: string;

    @Field(() => String)
    timeZone!: string;

    @Field(() => String, { description: 'Currency of every amount, e.g. "PHP"' })
    currency!: string;

    @Field(() => Boolean)
    includeUpcoming!: boolean;

    @Field(() => Date)
    generatedAt!: Date;

    @Field(() => SalesTotalsObject)
    totals!: SalesTotalsObject;

    @Field(() => [TherapistSalesObject], { description: 'Roster order; removed therapists last' })
    therapists!: TherapistSalesObject[];

    @Field(() => [ServiceSalesObject])
    services!: ServiceSalesObject[];

    @Field(() => [SalesBucketObject])
    series!: SalesBucketObject[];

    @Field(() => [UnpricedBookingObject])
    unpriced!: UnpricedBookingObject[];

    @Field(() => [PromoSalesObject], { description: 'Most used first' })
    promos!: PromoSalesObject[];

    @Field(() => ClientSummaryObject)
    clients!: ClientSummaryObject;
}
