import { Field, Float, ID, InputType, Int, ObjectType, registerEnumType } from 'type-graphql';
import { DiscountType } from '../db/_schedule.enum.js';

// GraphQL shapes (what clients see). Validation rules live in db/promo.zod.ts

registerEnumType(DiscountType, {
    name: 'DiscountType',
    description: 'percent = value % off the price; amount = value pesos off (capped at the price)',
});

@ObjectType('Promo', {
    description:
        'A promo code (one per booking). Its terms lock once a booking uses it; it can be ' +
        'archived or activated any time.',
})
export class PromoObject {
    @Field(() => ID)
    id!: string;

    @Field(() => String)
    code!: string;

    @Field(() => String)
    description!: string;

    @Field(() => DiscountType)
    discountType!: DiscountType;

    @Field(() => Float, { description: 'Percent or pesos, depending on discountType' })
    value!: number;

    @Field(() => String, { description: 'First day it can be used, "YYYY-MM-DD"' })
    validFrom!: string;

    @Field(() => String, { nullable: true, description: 'Last day; null = no end' })
    validTo!: string | null;

    @Field(() => [ID], { description: 'Services it applies to; empty = every service' })
    serviceIds!: string[];

    @Field(() => Boolean)
    isActive!: boolean;

    @Field(() => Int, { description: 'Bookings that used it' })
    timesUsed!: number;

    @Field(() => Boolean, {
        description: 'Used at least once: code, discount and services are fixed',
    })
    isLocked!: boolean;

    @Field(() => Date)
    createdAt!: Date;

    @Field(() => Date)
    updatedAt!: Date;
}

@InputType('CreatePromoInput')
export class CreatePromoInputType {
    @Field(() => String)
    code!: string;

    @Field(() => String, { nullable: true })
    description?: string;

    @Field(() => DiscountType)
    discountType!: DiscountType;

    @Field(() => Float)
    value!: number;

    @Field(() => String)
    validFrom!: string;

    @Field(() => String, { nullable: true })
    validTo?: string | null;

    @Field(() => [ID], { nullable: true })
    serviceIds?: string[];

    @Field(() => Boolean, { nullable: true, defaultValue: true })
    isActive?: boolean;
}

@InputType('UpdatePromoInput', {
    description:
        'Only the fields you send change; validTo: null removes the end date. Once used, ' +
        'code, discountType, value and serviceIds can no longer change (PROMO_LOCKED).',
})
export class UpdatePromoInputType {
    @Field(() => String, { nullable: true })
    code?: string;

    @Field(() => String, { nullable: true })
    description?: string;

    @Field(() => DiscountType, { nullable: true })
    discountType?: DiscountType;

    @Field(() => Float, { nullable: true })
    value?: number;

    @Field(() => String, { nullable: true })
    validFrom?: string;

    @Field(() => String, { nullable: true })
    validTo?: string | null;

    @Field(() => [ID], { nullable: true })
    serviceIds?: string[];

    @Field(() => Boolean, { nullable: true })
    isActive?: boolean;
}
