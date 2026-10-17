import { Field, ID, InputType, ObjectType } from 'type-graphql';
import { PaginatedResponse } from '../../../shared/graphql/pagination.types.js';

// GraphQL shapes (what clients see). Validation rules live in db/example.zod.ts

@ObjectType('Example')
export class ExampleObject {
    @Field(() => ID)
    id!: string;

    @Field(() => String)
    firstName!: string;

    @Field(() => String)
    lastName!: string;

    @Field(() => Date)
    createdAt!: Date;

    @Field(() => Date)
    updatedAt!: Date;
}

@ObjectType('ExamplePage')
export class ExamplePage extends PaginatedResponse(ExampleObject) {}

@InputType('CreateExampleInput')
export class CreateExampleInputType {
    @Field(() => String)
    firstName!: string;

    @Field(() => String)
    lastName!: string;
}

@InputType('UpdateExampleInput', { description: 'Only the fields you send are changed' })
export class UpdateExampleInputType {
    @Field(() => String, { nullable: true })
    firstName?: string;

    @Field(() => String, { nullable: true })
    lastName?: string;
}
