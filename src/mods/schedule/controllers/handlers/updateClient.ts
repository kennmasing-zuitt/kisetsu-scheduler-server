import { Arg, Authorized, ID, Mutation, Resolver } from 'type-graphql';
import { Permission } from '../../../roles/index.js';
import { parseInput } from '../../../../shared/validation.js';
import type { ClientWithStats } from '../../db/_schedule.types.js';
import { ClientIdArgs, UpdateClientInput } from '../../db/client.zod.js';
import { ClientObject, UpdateClientInputType } from '../../dto/client.dto.js';
import * as ScheduleImpl from '../../service/index.js';

@Resolver()
export class UpdateClientHandler {
    @Authorized(Permission.updateClient)
    @Mutation(() => ClientObject, {
        description: 'Rename a client or change their mobile / notes. Errors: CLIENT_MOBILE_TAKEN',
    })
    async updateClient(
        @Arg('id', () => ID) id: string,
        @Arg('input', () => UpdateClientInputType) input: UpdateClientInputType,
    ): Promise<ClientWithStats> {
        const { id: _id } = parseInput(ClientIdArgs, { id });
        return ScheduleImpl.updateClient({ _id, ...parseInput(UpdateClientInput, input) });
    }
}
