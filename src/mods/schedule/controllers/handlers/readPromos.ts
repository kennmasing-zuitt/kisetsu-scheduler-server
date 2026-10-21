import { Arg, Authorized, Query, Resolver } from 'type-graphql';
import { parseInput } from '../../../../shared/validation.js';
import type { PromoWithUsage } from '../../db/_schedule.types.js';
import { PromoCodeArgs } from '../../db/promo.zod.js';
import { PromoObject } from '../../dto/promo.dto.js';
import * as ScheduleImpl from '../../service/index.js';

@Resolver()
export class ReadPromosHandler {
    @Authorized()
    @Query(() => [PromoObject], { description: 'Promo codes, with how often each was used' })
    async promos(
        @Arg('includeArchived', () => Boolean, { defaultValue: false }) includeArchived: boolean,
    ): Promise<PromoWithUsage[]> {
        return ScheduleImpl.readPromos({ includeArchived });
    }

    @Authorized()
    @Query(() => PromoObject, {
        nullable: true,
        description: 'A promo by code (case doesn’t matter)',
    })
    async promo(@Arg('code', () => String) code: string): Promise<PromoWithUsage | null> {
        return ScheduleImpl.findPromo({ code: parseInput(PromoCodeArgs, { code }).code });
    }
}
