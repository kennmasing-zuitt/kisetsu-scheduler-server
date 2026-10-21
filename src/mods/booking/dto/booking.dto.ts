import { Field, Float, ID, InputType, Int, ObjectType } from 'type-graphql';

// Public booking-site types. Named "Public…"/"Online…" so they never clash with staff types.

@ObjectType('SetupCodeSent')
export class SetupCodeSentObject {
    @Field(() => String, { description: 'Masked number the code went to, e.g. "0917 *** 4567"' })
    sentTo!: string;

    @Field(() => Date)
    expiresAt!: Date;

    @Field(() => Date, { description: 'When a new code may be requested' })
    resendAfter!: Date;
}

@ObjectType('SetupCodeVerified')
export class SetupCodeVerifiedObject {
    @Field(() => String, { description: 'Proves the number for the next 15 minutes' })
    setupToken!: string;

    @Field(() => Boolean, { description: 'New client: ask for a first name (startAppSetup)' })
    needsName!: boolean;

    @Field(() => String, { nullable: true })
    firstName!: string | null;

    @Field(() => Boolean, { description: 'Already set up (a new setup replaces the old phone)' })
    hasApp!: boolean;
}

@ObjectType('AppEnrollment', {
    description: 'Scan qrDataUrl in Google Authenticator (or type secret)',
})
export class AppEnrollmentObject {
    @Field(() => String)
    setupToken!: string;

    @Field(() => String)
    secret!: string;

    @Field(() => String)
    otpauthUrl!: string;

    @Field(() => String, { description: 'PNG data URL' })
    qrDataUrl!: string;
}

@ObjectType('ClientSession', { description: 'Send token as `Authorization: Bearer <token>`' })
export class ClientSessionObject {
    @Field(() => String)
    token!: string;

    @Field(() => Date)
    expiresAt!: Date;

    @Field(() => ID)
    clientId!: string;

    @Field(() => String)
    firstName!: string;
}

@ObjectType('ServiceOption')
export class ServiceOptionObject {
    @Field(() => Int)
    durationMin!: number;

    @Field(() => Float, { description: 'PHP, list price that day' })
    price!: number;
}

@ObjectType('PublicService')
export class PublicServiceObject {
    @Field(() => ID)
    id!: string;

    @Field(() => String)
    name!: string;

    @Field(() => [ServiceOptionObject])
    options!: ServiceOptionObject[];
}

@ObjectType('PublicTherapist')
export class PublicTherapistObject {
    @Field(() => ID)
    id!: string;

    @Field(() => String, { description: 'First name' })
    name!: string;
}

@ObjectType('Slot')
export class SlotObject {
    @Field(() => Date)
    start!: Date;

    @Field(() => Date)
    end!: Date;

    @Field(() => [ID], { description: 'Therapists free for the whole slot' })
    therapistIds!: string[];
}

@ObjectType('BookingWindow', { description: 'Which days and times can be booked online' })
export class BookingWindowObject {
    @Field(() => String, { description: 'Today, YYYY-MM-DD (business time zone)' })
    today!: string;

    @Field(() => String, { description: 'Last bookable day, YYYY-MM-DD' })
    lastDay!: string;

    @Field(() => Date, { description: 'Earliest bookable start' })
    earliestStart!: Date;

    @Field(() => String)
    timeZone!: string;

    @Field(() => String, { description: 'Phone number to call, if set' })
    phone!: string;
}

@ObjectType('AppointmentConfirmation')
export class AppointmentConfirmationObject {
    @Field(() => ID)
    bookingId!: string;

    @Field(() => Date)
    start!: Date;

    @Field(() => Date)
    end!: Date;

    @Field(() => String)
    serviceName!: string;

    @Field(() => Int)
    durationMin!: number;

    @Field(() => String)
    therapistName!: string;

    @Field(() => Float, { description: 'List price; promos are applied at the front desk' })
    price!: number;
}

@InputType('AppointmentInput')
export class AppointmentInputType {
    @Field(() => ID)
    serviceId!: string;

    @Field(() => Int)
    durationMin!: number;

    @Field(() => Date, { description: 'A start time from availableSlots' })
    start!: Date;

    @Field(() => ID, { nullable: true, description: 'Omit for any therapist' })
    therapistId?: string;
}
