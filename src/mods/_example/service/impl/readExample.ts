import type { Paginated, Pagination } from '../../../../shared/pagination.js';
import type { Example } from '../../db/_example.types.js';
import * as ExampleOperations from '../../db/repository/index.js';

export const readExample = async (pagination: Pagination): Promise<Paginated<Example>> =>
    ExampleOperations.readExample(pagination);
