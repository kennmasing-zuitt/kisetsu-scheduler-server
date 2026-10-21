import { Arg, Authorized, ID, Query, Resolver } from 'type-graphql';
import { Permission } from '../../../roles/index.js';
import { parseInput } from '../../../../shared/validation.js';
import type { ClientWithStats } from '../../db/_schedule.types.js';
import { ClientIdArgs, MobileNumber } from '../../db/client.zod.js';
import { ClientObject } from '../../dto/client.dto.js';
import * as ScheduleImpl from '../../service/index.js';

@Resolver()
export class FindClientHandler {
    @Authorized(Permission.readClients)
    @Query(() => ClientObject, {
        nullable: true,
        description: "A client, or null if it doesn't exist",
    })
    async client(@Arg('id', () => ID) id: string): Promise<ClientWithStats | null> {
        return ScheduleImpl.findClient({ id: parseInput(ClientIdArgs, { id }).id });
    }

    @Authorized(Permission.readClients)
    @Query(() => ClientObject, {
        nullable: true,
        description:
            'The client with this mobile (any accepted format), or null when the number is new. ' +
            'VALIDATION_ERROR for numbers that are not valid mobiles.',
    })
    async clientByMobile(
        @Arg('mobile', () => String) mobile: string,
    ): Promise<ClientWithStats | null> {
        return ScheduleImpl.findClient({ mobile: parseInput(MobileNumber, mobile) });
    }
}
