import { Arg, Authorized, ID, Mutation, Resolver } from 'type-graphql';
import { Permission } from '../../../roles/index.js';
import { parseInput } from '../../../../shared/validation.js';
import type { Service } from '../../db/_schedule.types.js';
import { ServiceIdArgs, UpdateServiceInput } from '../../db/service.zod.js';
import { ServiceObject, UpdateServiceInputType } from '../../dto/service.dto.js';
import * as ScheduleImpl from '../../service/index.js';

@Resolver()
export class UpdateServiceHandler {
    @Authorized(Permission.updateService)
    @Mutation(() => ServiceObject, {
        description:
            'Rename, archive (isActive: false) or replace the price list. Reports are priced ' +
            'from the list as it is when they run, so editing an old period corrects past reports.',
    })
    async updateService(
        @Arg('id', () => ID) id: string,
        @Arg('input', () => UpdateServiceInputType) input: UpdateServiceInputType,
    ): Promise<Service> {
        const { id: _id } = parseInput(ServiceIdArgs, { id });
        const fields = parseInput(UpdateServiceInput, input);
        return ScheduleImpl.updateService({ _id, ...fields });
    }
}
