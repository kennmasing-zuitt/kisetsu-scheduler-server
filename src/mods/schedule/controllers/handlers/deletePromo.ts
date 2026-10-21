import { Arg, Authorized, ID, Mutation, Resolver } from 'type-graphql';
import { Permission } from '../../../roles/index.js';
import { parseInput } from '../../../../shared/validation.js';
import { PromoIdArgs } from '../../db/promo.zod.js';
import * as ScheduleImpl from '../../service/index.js';

@Resolver()
export class DeletePromoHandler {
    @Authorized(Permission.deletePromo)
    @Mutation(() => Boolean, {
        description:
            'Deletes a promo no booking used. Errors: NOT_FOUND, PROMO_IN_USE (archive it)',
    })
    async deletePromo(@Arg('id', () => ID) id: string): Promise<boolean> {
        return ScheduleImpl.deletePromo(parseInput(PromoIdArgs, { id }).id);
    }
}
