import { Arg, Authorized, Mutation, Resolver } from 'type-graphql';
import { Permission } from '../../../roles/index.js';
import { parseInput } from '../../../../shared/validation.js';
import type { Example } from '../../db/_example.types.js';
import { CreateExampleInput } from '../../db/example.zod.js';
import { CreateExampleInputType, ExampleObject } from '../../dto/example.dto.js';
import * as ExampleImpl from '../../service/index.js';

@Resolver()
export class CreateExampleHandler {
    @Authorized(Permission.createExample)
    @Mutation(() => ExampleObject, { description: '(was POST /api/v1/example/createExample)' })
    async createExample(
        @Arg('input', () => CreateExampleInputType) input: CreateExampleInputType,
    ): Promise<Example> {
        return ExampleImpl.createExample(parseInput(CreateExampleInput, input));
    }
}
