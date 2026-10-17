import type { Role } from '../../db/_roles.types.js';
import * as RolesOperations from '../../db/repository/index.js';

/**
 * Request-scoped role lookup: each role key is fetched at most once per request, so resolving
 * `User.role` for a page of users doesn't run one query per user.
 */
export const createRoleCache = () => {
    const cache = new Map<string, Promise<Role | null>>();
    return {
        get(key: string): Promise<Role | null> {
            if (!cache.has(key)) cache.set(key, RolesOperations.findRoleByKey(key));
            return cache.get(key)!;
        },
    };
};

export type RoleCache = ReturnType<typeof createRoleCache>;
