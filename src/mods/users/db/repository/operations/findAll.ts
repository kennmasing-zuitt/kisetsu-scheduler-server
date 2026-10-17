import type { Paginated, Pagination } from '../../../../../shared/pagination.js';
import type { PublicUser } from '../../_users.types.js';
import { UserModel } from '../../user.model.js';

export const findAll = async ({ page, limit }: Pagination): Promise<Paginated<PublicUser>> => {
    const [docs, total] = await Promise.all([
        UserModel.find()
            .sort({ createdAt: -1, _id: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean<PublicUser[]>(),
        UserModel.countDocuments(),
    ]);
    return { data: docs, page, limit, total, totalPages: Math.ceil(total / limit) };
};
