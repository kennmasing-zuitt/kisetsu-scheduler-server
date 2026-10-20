import { ArgsType, Field, Float, ID, Int, ObjectType, registerEnumType } from 'type-graphql';
import { ReportPeriod, UnpricedReason } from '../db/_reports.enum.js';

// GraphQL shapes (what clients see). Validation rules live in db/report.zod.ts

registerEnumType(ReportPeriod, {
    name: 'ReportPeriod',
    description: 'weekly = Monday to Sunday; monthly; annual. Dates in SCHEDULE_TIMEZONE',
});
registerEnumType(UnpricedReason, {
    name: 'UnpricedReason',
    description: 'noService = booking has no service; noPrice = no price rule for its date/length',
});

@ArgsType()
export class SalesReportArgsType {
    @Field(() => ReportPeriod)
    period!: ReportPeriod;

    @Field(() => String, { description: 'Any day in the wanted week / month / year, "YYYY-MM-DD"' })
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

    @Field(() => Float)
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

    @Field(() => Float)
    revenue!: number;

    @Field(() => Int, { description: 'Bookings that added no revenue (see SalesReport.unpriced)' })
    unpriced!: number;

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
    revenue!: number;

    @Field(() => Int)
    unpriced!: number;

    @Field(() => [SalesLineObject])
    lines!: SalesLineObject[];
}

@ObjectType('SalesBucket', {
    description: 'One day (weekly/monthly) or month (annual) of the chart',
})
export class SalesBucketObject {
    @Field(() => String, { description: '"YYYY-MM-DD", or "YYYY-MM" in annual reports' })
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

    @Field(() => Float)
    revenue!: number;

    @Field(() => Int)
    unpriced!: number;
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
}
