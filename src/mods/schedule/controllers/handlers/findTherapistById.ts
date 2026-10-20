import { Arg, Authorized, ID, Query, Resolver } from 'type-graphql';
import { parseInput } from '../../../../shared/validation.js';
import type { Therapist } from '../../db/_schedule.types.js';
import { TherapistIdArgs } from '../../db/therapist.zod.js';
import { TherapistObject } from '../../dto/therapist.dto.js';
import * as ScheduleImpl from '../../service/index.js';

@Resolver()
export class FindTherapistByIdHandler {
    @Authorized()
    @Query(() => TherapistObject, {
        nullable: true,
        description: "A single therapist, or null if it doesn't exist",
    })
    async therapist(@Arg('id', () => ID) id: string): Promise<Therapist | null> {
        return ScheduleImpl.findTherapistById(parseInput(TherapistIdArgs, { id }).id);
    }
}
