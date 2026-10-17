import type { CreateExampleData, ExampleDocument } from '../../db/_example.types.js';
import * as ExampleOperations from '../../db/repository/index.js';

export const createExample = async (data: CreateExampleData): Promise<ExampleDocument> =>
    ExampleOperations.createExample({ firstName: data.firstName, lastName: data.lastName });
