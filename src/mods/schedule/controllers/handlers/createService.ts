import { Arg, Authorized, Mutation, Resolver } from 'type-graphql';
import { Permission } from '../../../roles/index.js';
import { parseInput } from '../../../../shared/validation.js';
import type { ServiceDocument } from '../../db/_schedule.types.js';
import { CreateServiceInput } from '../../db/service.zod.js';
import { CreateServiceInputType, ServiceObject } from '../../dto/service.dto.js';
import * as ScheduleImpl from '../../service/index.js';

@Resolver()
export class CreateServiceHandler {
    @Authorized(Permission.createService)
    @Mutation(() => ServiceObject, {
        description:
            'Adds a service with its price list. Errors: VALIDATION_ERROR, SERVICE_NAME_TAKEN',
    })
    async createService(
        @Arg('input', () => CreateServiceInputType) input: CreateServiceInputType,
    ): Promise<ServiceDocument> {
        return ScheduleImpl.createService(parseInput(CreateServiceInput, input));
    }
}
