import { Args, Query, Resolver } from 'type-graphql';
import { PaginationArgs } from '../../../../shared/graphql/pagination.types.js';
import { PaginationSchema, type Paginated } from '../../../../shared/pagination.js';
import { parseInput } from '../../../../shared/validation.js';
import type { Example } from '../../db/_example.types.js';
import { ExamplePage } from '../../dto/example.dto.js';
import * as ExampleImpl from '../../service/index.js';

@Resolver()
export class ReadExampleHandler {
    @Query(() => ExamplePage, {
        description: 'Paginated list, newest first. (was GET /api/v1/example/readExample)',
    })
    async examples(@Args(() => PaginationArgs) args: PaginationArgs): Promise<Paginated<Example>> {
        return ExampleImpl.readExample(parseInput(PaginationSchema, args));
    }
}
