import { Arg, ID, Mutation, Resolver } from 'type-graphql';
import { parseInput } from '../../../../shared/validation.js';
import type { Example } from '../../db/_example.types.js';
import { ExampleIdArgs, UpdateExampleInput } from '../../db/example.zod.js';
import { ExampleObject, UpdateExampleInputType } from '../../dto/example.dto.js';
import * as ExampleImpl from '../../service/index.js';

@Resolver()
export class UpdateExampleHandler {
    @Mutation(() => ExampleObject, { description: '(was POST /api/v1/example/updateExample)' })
    async updateExample(
        @Arg('id', () => ID) id: string,
        @Arg('input', () => UpdateExampleInputType) input: UpdateExampleInputType,
    ): Promise<Example> {
        const { id: _id } = parseInput(ExampleIdArgs, { id });
        const fields = parseInput(UpdateExampleInput, input);
        return ExampleImpl.updateExample({ _id, ...fields });
    }
}
