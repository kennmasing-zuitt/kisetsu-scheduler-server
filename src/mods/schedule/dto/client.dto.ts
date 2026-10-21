import { ArgsType, Field, ID, InputType, Int, ObjectType } from 'type-graphql';
import { PaginatedResponse } from '../../../shared/graphql/pagination.types.js';

// GraphQL shapes (what clients see). Validation rules live in db/client.zod.ts

@ObjectType('ClientStats', {
    description: 'Counted from bookings. A visit is a booking that has ended (service rendered).',
})
export class ClientStatsObject {
    @Field(() => Int)
    visits!: number;

    @Field(() => Int, { description: 'Bookings that have not ended yet' })
    upcoming!: number;

    @Field(() => Date, { nullable: true })
    firstVisit!: Date | null;

    @Field(() => Date, { nullable: true })
    lastVisit!: Date | null;

    @Field(() => Int, { description: 'Visits where the client asked for the therapist by name' })
    requested!: number;

    @Field(() => ID, { nullable: true, description: 'The therapist the client has seen most' })
    favouriteTherapistId!: string | null;

    @Field(() => String, { nullable: true })
    favouriteTherapistName!: string | null;
}

@ObjectType('Client', { description: 'A spa client, identified by mobile number' })
export class ClientObject {
    @Field(() => ID)
    id!: string;

    @Field(() => String, { description: 'Canonical form, e.g. "+639171234567"' })
    mobile!: string;

    @Field(() => String)
    firstName!: string;

    @Field(() => String)
    lastName!: string;

    @Field(() => String)
    fullName!: string;

    @Field(() => String)
    notes!: string;

    @Field(() => ClientStatsObject)
    stats!: ClientStatsObject;

    @Field(() => Date, {
        nullable: true,
        description: 'When the client set up app sign-in for the booking site; null if not set up',
    })
    appEnabledAt!: Date | null;

    @Field(() => Date)
    createdAt!: Date;

    @Field(() => Date)
    updatedAt!: Date;
}

@ObjectType('ClientPage')
export class ClientPage extends PaginatedResponse(ClientObject) {}

@ArgsType()
export class ClientSearchArgsType {
    @Field(() => String, { nullable: true, description: 'Name words or 3+ digits of the mobile' })
    search?: string;

    @Field(() => Int, { nullable: true, defaultValue: 1 })
    page?: number;

    @Field(() => Int, { nullable: true, defaultValue: 20, description: 'Max 100' })
    limit?: number;
}

@ArgsType()
export class ClientBookingsArgsType {
    @Field(() => ID)
    clientId!: string;

    @Field(() => Int, { nullable: true, defaultValue: 20, description: 'Max 100' })
    limit?: number;
}

@InputType('UpdateClientInput', {
    description: 'Only the fields you send are changed; bookings show the new name and mobile',
})
export class UpdateClientInputType {
    @Field(() => String, { nullable: true })
    mobile?: string;

    @Field(() => String, { nullable: true })
    firstName?: string;

    @Field(() => String, { nullable: true })
    lastName?: string;

    @Field(() => String, { nullable: true })
    notes?: string;
}
