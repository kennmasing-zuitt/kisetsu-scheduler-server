import { Arg, ID, Query, Resolver } from 'type-graphql';
import { parseInput } from '../../../../shared/validation.js';
import type { Example } from '../../db/_example.types.js';
import { ExampleIdArgs } from '../../db/example.zod.js';
import { ExampleObject } from '../../dto/example.dto.js';
import * as ExampleImpl from '../../service/index.js';

@Resolver()
export class FindExampleByIdHandler {
    @Query(() => ExampleObject, {
        nullable: true,
        description: "A single example, or null if it doesn't exist",
    })
    async example(@Arg('id', () => ID) id: string): Promise<Example | null> {
        return ExampleImpl.findExampleById(parseInput(ExampleIdArgs, { id }).id);
    }
}
