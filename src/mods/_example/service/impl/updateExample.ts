import { NotFoundError } from '../../../../shared/errors/AppError.js';
import type { Example, UpdateExampleData } from '../../db/_example.types.js';
import * as ExampleOperations from '../../db/repository/index.js';

export const updateExample = async (data: UpdateExampleData): Promise<Example> => {
    const updatedExample = await ExampleOperations.updateExample({
        _id: data._id,
        firstName: data.firstName,
        lastName: data.lastName,
    });

    if (!updatedExample) throw new NotFoundError('Example not found');

    return updatedExample;
};
