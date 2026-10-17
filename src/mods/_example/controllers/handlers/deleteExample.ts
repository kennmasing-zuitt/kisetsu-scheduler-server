import { Arg, Authorized, ID, Mutation, Resolver } from 'type-graphql';
import { Permission } from '../../../roles/index.js';
import { parseInput } from '../../../../shared/validation.js';
import { ExampleIdArgs } from '../../db/example.zod.js';
import * as ExampleImpl from '../../service/index.js';

@Resolver()
export class DeleteExampleHandler {
    @Authorized(Permission.deleteExample)
    @Mutation(() => Boolean, {
        description:
            'Returns true when deleted; NOT_FOUND error otherwise. (was POST /api/v1/example/deleteExample)',
    })
    async deleteExample(@Arg('id', () => ID) id: string): Promise<boolean> {
        return ExampleImpl.deleteExample(parseInput(ExampleIdArgs, { id }).id);
    }
}
