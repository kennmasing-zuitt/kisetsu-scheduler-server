import { Field, ID, InputType, ObjectType } from 'type-graphql';

// GraphQL shapes (what clients see). Validation rules live in db/room.zod.ts

@ObjectType('Room', { description: 'A treatment room; every booking takes one' })
export class RoomObject {
    @Field(() => ID)
    id!: string;

    @Field(() => String)
    name!: string;

    @Field(() => String, { description: 'Hex color "#RRGGBB" for its bookings on the calendar' })
    color!: string;

    @Field(() => Date)
    createdAt!: Date;

    @Field(() => Date)
    updatedAt!: Date;
}

@InputType('CreateRoomInput')
export class CreateRoomInputType {
    @Field(() => String)
    name!: string;

    @Field(() => String)
    color!: string;
}

@InputType('UpdateRoomInput', { description: 'Only the fields you send are changed' })
export class UpdateRoomInputType {
    @Field(() => String, { nullable: true })
    name?: string;

    @Field(() => String, { nullable: true })
    color?: string;
}
