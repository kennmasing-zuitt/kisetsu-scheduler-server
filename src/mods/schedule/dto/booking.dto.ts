import { ArgsType, Field, ID, InputType, ObjectType } from 'type-graphql';

// GraphQL shapes (what clients see). Validation rules live in db/booking.zod.ts

@ObjectType('Booking', { description: 'A client booking: one therapist, one room, one time range' })
export class BookingObject {
    @Field(() => ID)
    id!: string;

    @Field(() => String)
    client!: string;

    @Field(() => ID)
    therapistId!: string;

    @Field(() => ID)
    roomId!: string;

    @Field(() => Date)
    start!: Date;

    @Field(() => Date)
    end!: Date;

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
    @Field(() => String)
    client!: string;

    @Field(() => ID)
    therapistId!: string;

    @Field(() => ID)
    roomId!: string;

    @Field(() => Date)
    start!: Date;

    @Field(() => Date)
    end!: Date;
}

@InputType('UpdateBookingInput', {
    description: 'Only the fields you send are changed; the result must still pass every rule',
})
export class UpdateBookingInputType {
    @Field(() => String, { nullable: true })
    client?: string;

    @Field(() => ID, { nullable: true })
    therapistId?: string;

    @Field(() => ID, { nullable: true })
    roomId?: string;

    @Field(() => Date, { nullable: true })
    start?: Date;

    @Field(() => Date, { nullable: true })
    end?: Date;
}
