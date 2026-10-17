import type { Paginated, Pagination } from '../../../../../shared/pagination.js';
import type { Example } from '../../_example.types.js';
import { ExampleModel } from '../../example.model.js';

export const readExample = async ({ page, limit }: Pagination): Promise<Paginated<Example>> => {
    const [docs, total] = await Promise.all([
        ExampleModel.find()
            .sort({ createdAt: -1, _id: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean<Example[]>(),
        ExampleModel.countDocuments(),
    ]);
    return { data: docs, page, limit, total, totalPages: Math.ceil(total / limit) };
};
