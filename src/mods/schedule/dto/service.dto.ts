import { Field, Float, ID, InputType, Int, ObjectType } from 'type-graphql';

// GraphQL shapes (what clients see). Validation rules live in db/service.zod.ts

@ObjectType('ServicePrice', {
    description:
        'One price rule. A booking takes the rule whose period contains its local date and ' +
        'whose days and length match it. Rules of a service never overlap.',
})
export class ServicePriceObject {
    @Field(() => ID)
    id!: string;

    @Field(() => Int, {
        nullable: true,
        description: 'Minutes this price is for; null = any length',
    })
    durationMin!: number | null;

    @Field(() => [Int], { description: 'Weekdays it applies to (0 = Sunday); empty = every day' })
    days!: number[];

    @Field(() => Float, { description: 'Price in PHP' })
    amount!: number;

    @Field(() => String, { description: 'First day of the period, "YYYY-MM-DD" (inclusive)' })
    validFrom!: string;

    @Field(() => String, {
        nullable: true,
        description: 'Last day of the period (inclusive); null = still the current price',
    })
    validTo!: string | null;
}

@ObjectType('Service', { description: 'A service clients book (Fuyu, Natsu, ...) and its prices' })
export class ServiceObject {
    @Field(() => ID)
    id!: string;

    @Field(() => String)
    name!: string;

    @Field(() => String)
    description!: string;

    @Field(() => Boolean, {
        description: 'False = archived: not offered for new bookings, still in reports',
    })
    isActive!: boolean;

    @Field(() => [ServicePriceObject], { description: 'Full price history, current and past' })
    prices!: ServicePriceObject[];

    @Field(() => Date)
    createdAt!: Date;

    @Field(() => Date)
    updatedAt!: Date;
}

@InputType('ServicePriceInput')
export class ServicePriceInputType {
    @Field(() => Int, { nullable: true, description: 'Minutes; leave out for any length' })
    durationMin?: number | null;

    @Field(() => [Int], {
        nullable: true,
        description: 'Weekdays (0 = Sunday); leave out for every day',
    })
    days?: number[];

    @Field(() => Float)
    amount!: number;

    @Field(() => String, { description: '"YYYY-MM-DD"' })
    validFrom!: string;

    @Field(() => String, { nullable: true, description: '"YYYY-MM-DD"; leave out while current' })
    validTo?: string | null;
}

@InputType('CreateServiceInput')
export class CreateServiceInputType {
    @Field(() => String)
    name!: string;

    @Field(() => String, { nullable: true })
    description?: string;

    @Field(() => Boolean, { nullable: true, defaultValue: true })
    isActive?: boolean;

    @Field(() => [ServicePriceInputType])
    prices!: ServicePriceInputType[];
}

@InputType('UpdateServiceInput', {
    description: 'Only the fields you send are changed; `prices` replaces the whole price list',
})
export class UpdateServiceInputType {
    @Field(() => String, { nullable: true })
    name?: string;

    @Field(() => String, { nullable: true })
    description?: string;

    @Field(() => Boolean, { nullable: true })
    isActive?: boolean;

    @Field(() => [ServicePriceInputType], { nullable: true })
    prices?: ServicePriceInputType[];
}
