import { Arg, Authorized, ID, Mutation, Resolver } from 'type-graphql';
import { Permission } from '../../../roles/index.js';
import { parseInput } from '../../../../shared/validation.js';
import type { PromoWithUsage } from '../../db/_schedule.types.js';
import { PromoIdArgs, UpdatePromoInput } from '../../db/promo.zod.js';
import { PromoObject, UpdatePromoInputType } from '../../dto/promo.dto.js';
import * as ScheduleImpl from '../../service/index.js';

@Resolver()
export class UpdatePromoHandler {
    @Authorized(Permission.updatePromo)
    @Mutation(() => PromoObject, {
        description:
            'Archive / activate (isActive), edit description or period any time. Code, discount ' +
            'and services lock once used (PROMO_LOCKED).',
    })
    async updatePromo(
        @Arg('id', () => ID) id: string,
        @Arg('input', () => UpdatePromoInputType) input: UpdatePromoInputType,
    ): Promise<PromoWithUsage> {
        const { id: _id } = parseInput(PromoIdArgs, { id });
        // Other fields: null means "unchanged"; validTo: null means "no end date"
        const sent = Object.fromEntries(
            Object.entries({ ...input }).filter(([k, v]) => v !== null || k === 'validTo'),
        );
        return ScheduleImpl.updatePromo({ _id, ...parseInput(UpdatePromoInput, sent) });
    }
}
