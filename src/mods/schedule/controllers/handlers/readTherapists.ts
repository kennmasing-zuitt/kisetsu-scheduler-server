import { Authorized, Query, Resolver } from 'type-graphql';
import type { Therapist } from '../../db/_schedule.types.js';
import { TherapistObject } from '../../dto/therapist.dto.js';
import * as ScheduleImpl from '../../service/index.js';

@Resolver()
export class ReadTherapistsHandler {
    @Authorized()
    @Query(() => [TherapistObject], { description: 'The whole roster, sorted by name' })
    async therapists(): Promise<Therapist[]> {
        return ScheduleImpl.readTherapists();
    }
}
