import { Arg, ID, Mutation, Resolver } from 'type-graphql';
import { parseInput } from '../../../../shared/validation.js';
import { ExampleIdArgs } from '../../db/example.zod.js';
import * as ExampleImpl from '../../service/index.js';

@Resolver()
export class DeleteExampleHandler {
    @Mutation(() => Boolean, {
        description:
            'Returns true when deleted; NOT_FOUND error otherwise. (was POST /api/v1/example/deleteExample)',
    })
    async deleteExample(@Arg('id', () => ID) id: string): Promise<boolean> {
        return ExampleImpl.deleteExample(parseInput(ExampleIdArgs, { id }).id);
    }
}
