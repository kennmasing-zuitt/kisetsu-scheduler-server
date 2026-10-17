import type { Example, UpdateExampleData } from '../../_example.types.js';
import { ExampleModel } from '../../example.model.js';

export const updateExample = async ({
    _id,
    ...fields
}: UpdateExampleData): Promise<Example | null> => {
    // Only $set the fields that were actually provided
    const $set = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
    return ExampleModel.findByIdAndUpdate(
        _id,
        { $set },
        { returnDocument: 'after', runValidators: true },
    ).lean<Example>();
};
