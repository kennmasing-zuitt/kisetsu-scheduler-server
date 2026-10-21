import { Arg, Authorized, ID, Mutation, Resolver } from 'type-graphql';
import { NotFoundError } from '../../../../shared/errors/AppError.js';
import { parseInput } from '../../../../shared/validation.js';
import { Permission } from '../../../roles/index.js';
import type { ClientWithStats } from '../../db/_schedule.types.js';
import { ClientIdArgs } from '../../db/client.zod.js';
import { ClientObject } from '../../dto/client.dto.js';
import * as ScheduleImpl from '../../service/index.js';

@Resolver()
export class ResetClientAppHandler {
    @Authorized(Permission.updateClient)
    @Mutation(() => ClientObject, {
        description:
            "Lost phone: turns off the client's app sign-in for the booking site and ends their " +
            'sessions. They set it up again on the booking site (SMS code, then QR).',
    })
    async resetClientApp(@Arg('id', () => ID) id: string): Promise<ClientWithStats> {
        const { id: clientId } = parseInput(ClientIdArgs, { id });
        await ScheduleImpl.resetClientApp(clientId);
        const client = await ScheduleImpl.findClient({ id: clientId });
        if (!client) throw new NotFoundError('Client not found');
        return client;
    }
}
