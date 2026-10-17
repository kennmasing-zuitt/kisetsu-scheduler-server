import { Arg, Mutation, Resolver } from 'type-graphql';
import { parseInput } from '../../../../shared/validation.js';
import type { Example } from '../../db/_example.types.js';
import { CreateExampleInput } from '../../db/example.zod.js';
import { CreateExampleInputType, ExampleObject } from '../../dto/example.dto.js';
import * as ExampleImpl from '../../service/index.js';

@Resolver()
export class CreateExampleHandler {
    @Mutation(() => ExampleObject, { description: '(was POST /api/v1/example/createExample)' })
    async createExample(
        @Arg('input', () => CreateExampleInputType) input: CreateExampleInputType,
    ): Promise<Example> {
        return ExampleImpl.createExample(parseInput(CreateExampleInput, input));
    }
}
