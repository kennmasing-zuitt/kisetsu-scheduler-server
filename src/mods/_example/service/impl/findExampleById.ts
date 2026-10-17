import type { Example } from '../../db/_example.types.js';
import * as ExampleOperations from '../../db/repository/index.js';

export const findExampleById = async (_id: string): Promise<Example | null> =>
    ExampleOperations.findExampleById(_id);
