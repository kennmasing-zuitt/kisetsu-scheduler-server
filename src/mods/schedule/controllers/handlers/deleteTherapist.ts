import { Arg, Authorized, ID, Mutation, Resolver } from 'type-graphql';
import { Permission } from '../../../roles/index.js';
import { parseInput } from '../../../../shared/validation.js';
import { TherapistIdArgs } from '../../db/therapist.zod.js';
import * as ScheduleImpl from '../../service/index.js';

@Resolver()
export class DeleteTherapistHandler {
    @Authorized(Permission.deleteTherapist)
    @Mutation(() => Boolean, {
        description: 'Returns true when deleted; NOT_FOUND error otherwise',
    })
    async deleteTherapist(@Arg('id', () => ID) id: string): Promise<boolean> {
        return ScheduleImpl.deleteTherapist(parseInput(TherapistIdArgs, { id }).id);
    }
}
