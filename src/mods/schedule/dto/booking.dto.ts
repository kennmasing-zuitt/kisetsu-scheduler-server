import { ArgsType, Field, ID, InputType, ObjectType, registerEnumType } from 'type-graphql';
import { BookingSource, BookingStatus, CancelReason } from '../db/_schedule.enum.js';

registerEnumType(BookingStatus, { name: 'BookingStatus' });
registerEnumType(BookingSource, {
    name: 'BookingSource',
    valuesConfig: {
        staff: { description: 'Made in the scheduling app' },
        client: { description: 'Made by the client on the booking site' },
    },
});
registerEnumType(CancelReason, { name: 'CancelReason' });
export { BookingSource, BookingStatus, CancelReason };

// GraphQL shapes (what clients see). Validation rules live in db/booking.zod.ts

@ObjectType('Booking', { description: 'A client booking: one therapist, one room, one time range' })
export class BookingObject {
    @Field(() => ID)
    id!: string;

    @Field(() => String, { description: "The client's name (kept in sync with the Client record)" })
    client!: string;

    @Field(() => ID, {
        nullable: true,
        description: 'Null only for bookings made before clients existed',
    })
    clientId!: string | null;

    @Field(() => String, { nullable: true, description: 'Canonical form, e.g. "+639171234567"' })
    clientMobile!: string | null;

    @Field(() => Boolean, { description: 'The client asked for this therapist by name' })
    isRequested!: boolean;

    @Field(() => ID, { nullable: true })
    promoId!: string | null;

    @Field(() => String, { nullable: true, description: 'The promo code applied, if any' })
    promoCode!: string | null;

    @Field(() => ID)
    therapistId!: string;

    @Field(() => ID)
    roomId!: string;

    @Field(() => ID, {
        nullable: true,
        description: 'The booked service; null only for bookings made before services existed',
    })
    serviceId!: string | null;

    @Field(() => Date)
    start!: Date;

    @Field(() => Date)
    end!: Date;

    @Field(() => BookingStatus)
    status!: BookingStatus;

    @Field(() => BookingSource)
    source!: BookingSource;

    @Field(() => Date, { nullable: true })
    cancelledAt!: Date | null;

    @Field(() => CancelReason, { nullable: true })
    cancelReason!: CancelReason | null;

    @Field(() => Date)
    createdAt!: Date;

    @Field(() => Date)
    updatedAt!: Date;
}

@ArgsType()
export class BookingRangeArgsType {
    @Field(() => Date, { description: 'Range start (inclusive)' })
    from!: Date;

    @Field(() => Date, { description: 'Range end (exclusive). At most 62 days after `from`' })
    to!: Date;

    @Field(() => ID, { nullable: true, description: "Only this therapist's bookings" })
    therapistId?: string;

    @Field(() => ID, { nullable: true, description: "Only this room's bookings" })
    roomId?: string;
}

@InputType('CreateBookingInput')
export class CreateBookingInputType {
    @Field(() => String, {
        description:
            'Any Philippine mobile format (0917 123 4567, +63 917…) or +<country code>…. ' +
            'Finds the client, or creates them when the number is new',
    })
    clientMobile!: string;

    @Field(() => String, { nullable: true, description: 'Required when the mobile is new' })
    clientFirstName?: string;

    @Field(() => String, { nullable: true })
    clientLastName?: string;

    @Field(() => Boolean, { nullable: true, defaultValue: false })
    isRequested?: boolean;

    @Field(() => String, {
        nullable: true,
        description: 'One promo per booking; case doesn’t matter',
    })
    promoCode?: string;

    @Field(() => ID)
    therapistId!: string;

    @Field(() => ID)
    roomId!: string;

    @Field(() => ID, { description: 'Must have a price for the booking length on its date' })
    serviceId!: string;

    @Field(() => Date)
    start!: Date;

    @Field(() => Date)
    end!: Date;
}

@InputType('UpdateBookingInput', {
    description: 'Only the fields you send are changed; the result must still pass every rule',
})
export class UpdateBookingInputType {
    @Field(() => String, { nullable: true, description: 'Re-links the booking to this client' })
    clientMobile?: string;

    @Field(() => String, { nullable: true, description: 'Used only when the mobile is new' })
    clientFirstName?: string;

    @Field(() => String, { nullable: true })
    clientLastName?: string;

    @Field(() => Boolean, { nullable: true })
    isRequested?: boolean;

    @Field(() => String, { nullable: true, description: '"" removes the promo' })
    promoCode?: string;

    @Field(() => ID, { nullable: true })
    therapistId?: string;

    @Field(() => ID, { nullable: true })
    roomId?: string;

    @Field(() => ID, { nullable: true })
    serviceId?: string;

    @Field(() => Date, { nullable: true })
    start?: Date;

    @Field(() => Date, { nullable: true })
    end?: Date;
}
