import { ExampleModel } from '../../example.model.js';

export const deleteExample = async (_id: string): Promise<boolean> => {
    const result = await ExampleModel.deleteOne({ _id });
    return result.deletedCount > 0;
};
