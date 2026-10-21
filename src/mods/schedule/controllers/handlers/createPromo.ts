import { Arg, Authorized, Mutation, Resolver } from 'type-graphql';
import { Permission } from '../../../roles/index.js';
import { parseInput } from '../../../../shared/validation.js';
import type { PromoWithUsage } from '../../db/_schedule.types.js';
import { CreatePromoInput } from '../../db/promo.zod.js';
import { CreatePromoInputType, PromoObject } from '../../dto/promo.dto.js';
import * as ScheduleImpl from '../../service/index.js';

@Resolver()
export class CreatePromoHandler {
    @Authorized(Permission.createPromo)
    @Mutation(() => PromoObject, { description: 'Errors: VALIDATION_ERROR, PROMO_CODE_TAKEN' })
    async createPromo(
        @Arg('input', () => CreatePromoInputType) input: CreatePromoInputType,
    ): Promise<PromoWithUsage> {
        return ScheduleImpl.createPromo(parseInput(CreatePromoInput, input));
    }
}
