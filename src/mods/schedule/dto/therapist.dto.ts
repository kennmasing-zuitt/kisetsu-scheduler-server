import { Field, ID, InputType, Int, ObjectType } from 'type-graphql';

// GraphQL shapes (what clients see). Validation rules live in db/therapist.zod.ts

@ObjectType('Therapist', { description: 'A therapist on the roster; one calendar column each' })
export class TherapistObject {
    @Field(() => ID)
    id!: string;

    @Field(() => String)
    name!: string;

    @Field(() => [Int], { description: 'Recurring weekly days off: 0 = Sunday … 6 = Saturday' })
    offDays!: number[];

    @Field(() => [String], { description: 'One-off leave, as local dates "YYYY-MM-DD"' })
    leaveDates!: string[];

    @Field(() => Date)
    createdAt!: Date;

    @Field(() => Date)
    updatedAt!: Date;
}

@InputType('CreateTherapistInput')
export class CreateTherapistInputType {
    @Field(() => String)
    name!: string;

    @Field(() => [Int], { nullable: true })
    offDays?: number[];

    @Field(() => [String], { nullable: true })
    leaveDates?: string[];
}

@InputType('UpdateTherapistInput', {
    description: 'Only the fields you send are changed; lists replace the stored list',
})
export class UpdateTherapistInputType {
    @Field(() => String, { nullable: true })
    name?: string;

    @Field(() => [Int], { nullable: true })
    offDays?: number[];

    @Field(() => [String], { nullable: true })
    leaveDates?: string[];
}
