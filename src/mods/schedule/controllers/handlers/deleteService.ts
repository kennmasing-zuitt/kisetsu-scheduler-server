import { Arg, Authorized, ID, Mutation, Resolver } from 'type-graphql';
import { Permission } from '../../../roles/index.js';
import { parseInput } from '../../../../shared/validation.js';
import { ServiceIdArgs } from '../../db/service.zod.js';
import * as ScheduleImpl from '../../service/index.js';

@Resolver()
export class DeleteServiceHandler {
    @Authorized(Permission.deleteService)
    @Mutation(() => Boolean, {
        description:
            'Deletes a service no booking uses. Errors: NOT_FOUND, SERVICE_IN_USE (archive it instead)',
    })
    async deleteService(@Arg('id', () => ID) id: string): Promise<boolean> {
        return ScheduleImpl.deleteService(parseInput(ServiceIdArgs, { id }).id);
    }
}
