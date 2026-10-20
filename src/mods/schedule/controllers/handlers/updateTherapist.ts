import { Arg, Authorized, ID, Mutation, Resolver } from 'type-graphql';
import { Permission } from '../../../roles/index.js';
import { parseInput } from '../../../../shared/validation.js';
import type { Therapist } from '../../db/_schedule.types.js';
import { TherapistIdArgs, UpdateTherapistInput } from '../../db/therapist.zod.js';
import { TherapistObject, UpdateTherapistInputType } from '../../dto/therapist.dto.js';
import * as ScheduleImpl from '../../service/index.js';

@Resolver()
export class UpdateTherapistHandler {
    @Authorized(Permission.updateTherapist)
    @Mutation(() => TherapistObject, {
        description: 'Rename a therapist or replace their weekly days off / leave dates',
    })
    async updateTherapist(
        @Arg('id', () => ID) id: string,
        @Arg('input', () => UpdateTherapistInputType) input: UpdateTherapistInputType,
    ): Promise<Therapist> {
        const { id: _id } = parseInput(TherapistIdArgs, { id });
        const fields = parseInput(UpdateTherapistInput, input);
        return ScheduleImpl.updateTherapist({ _id, ...fields });
    }
}
