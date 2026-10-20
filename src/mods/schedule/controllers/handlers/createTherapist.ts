import { Arg, Authorized, Mutation, Resolver } from 'type-graphql';
import { Permission } from '../../../roles/index.js';
import { parseInput } from '../../../../shared/validation.js';
import type { TherapistDocument } from '../../db/_schedule.types.js';
import { CreateTherapistInput } from '../../db/therapist.zod.js';
import { CreateTherapistInputType, TherapistObject } from '../../dto/therapist.dto.js';
import * as ScheduleImpl from '../../service/index.js';

@Resolver()
export class CreateTherapistHandler {
    @Authorized(Permission.createTherapist)
    @Mutation(() => TherapistObject, { description: 'Adds a therapist to the roster' })
    async createTherapist(
        @Arg('input', () => CreateTherapistInputType) input: CreateTherapistInputType,
    ): Promise<TherapistDocument> {
        return ScheduleImpl.createTherapist(parseInput(CreateTherapistInput, input));
    }
}
