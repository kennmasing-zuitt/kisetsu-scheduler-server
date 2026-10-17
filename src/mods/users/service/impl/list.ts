import type { Paginated, Pagination } from '../../../../shared/pagination.js';
import type { PublicUser } from '../../db/_users.types.js';
import * as UsersOperations from '../../db/repository/index.js';

export const list = async (pagination: Pagination): Promise<Paginated<PublicUser>> =>
    UsersOperations.findAll(pagination);
