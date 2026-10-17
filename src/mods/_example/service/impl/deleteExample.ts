import { NotFoundError } from '../../../../shared/errors/AppError.js';
import * as ExampleOperations from '../../db/repository/index.js';

export const deleteExample = async (_id: string): Promise<boolean> => {
    const deleted = await ExampleOperations.deleteExample(_id);
    if (!deleted) throw new NotFoundError('Example not found');
    return true;
};
