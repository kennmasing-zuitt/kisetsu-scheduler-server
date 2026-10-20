import { Arg, Authorized, ID, Query, Resolver } from 'type-graphql';
import { parseInput } from '../../../../shared/validation.js';
import type { Service } from '../../db/_schedule.types.js';
import { ServiceIdArgs } from '../../db/service.zod.js';
import { ServiceObject } from '../../dto/service.dto.js';
import * as ScheduleImpl from '../../service/index.js';

@Resolver()
export class FindServiceByIdHandler {
    @Authorized()
    @Query(() => ServiceObject, {
        nullable: true,
        description: "A single service, or null if it doesn't exist",
    })
    async service(@Arg('id', () => ID) id: string): Promise<Service | null> {
        return ScheduleImpl.findServiceById(parseInput(ServiceIdArgs, { id }).id);
    }
}
