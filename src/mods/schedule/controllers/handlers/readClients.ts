import { Args, Authorized, Query, Resolver } from 'type-graphql';
import { Permission } from '../../../roles/index.js';
import type { Paginated } from '../../../../shared/pagination.js';
import { parseInput } from '../../../../shared/validation.js';
import type { ClientWithStats } from '../../db/_schedule.types.js';
import { ClientSearchArgs } from '../../db/client.zod.js';
import { ClientPage, ClientSearchArgsType } from '../../dto/client.dto.js';
import * as ScheduleImpl from '../../service/index.js';

@Resolver()
export class ReadClientsHandler {
    @Authorized(Permission.readClients)
    @Query(() => ClientPage, { description: 'Clients by name or mobile, with visit counts' })
    async clients(
        @Args(() => ClientSearchArgsType) args: ClientSearchArgsType,
    ): Promise<Paginated<ClientWithStats>> {
        return ScheduleImpl.readClients(parseInput(ClientSearchArgs, args));
    }
}
