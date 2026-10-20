import { Arg, Authorized, Query, Resolver } from 'type-graphql';
import type { Service } from '../../db/_schedule.types.js';
import { ServiceObject } from '../../dto/service.dto.js';
import * as ScheduleImpl from '../../service/index.js';

@Resolver()
export class ReadServicesHandler {
    @Authorized()
    @Query(() => [ServiceObject], { description: 'Services sorted by name, with their prices' })
    async services(
        @Arg('includeArchived', () => Boolean, { defaultValue: false }) includeArchived: boolean,
    ): Promise<Service[]> {
        return ScheduleImpl.readServices({ includeArchived });
    }
}
