import type { Example } from '../../_example.types.js';
import { ExampleModel } from '../../example.model.js';

export const findExampleById = async (_id: string): Promise<Example | null> =>
    ExampleModel.findById(_id).lean<Example>();
