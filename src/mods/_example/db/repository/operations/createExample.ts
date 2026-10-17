import type { CreateExampleData, ExampleDocument } from '../../_example.types.js';
import { ExampleModel } from '../../example.model.js';

export const createExample = async (data: CreateExampleData): Promise<ExampleDocument> =>
    ExampleModel.create(data);
