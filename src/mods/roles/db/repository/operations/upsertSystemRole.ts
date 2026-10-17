import { mongo } from 'mongoose';
import type { RoleDefinition } from '../../_roles.enum.js';
import { RoleModel } from '../../role.model.js';

/** Creates a system role if it's missing. Never overwrites an existing one. */
export const upsertSystemRole = async (def: RoleDefinition): Promise<void> => {
    if (await RoleModel.exists({ key: def.key })) return;
    try {
        await RoleModel.create({ ...def, isSystem: true });
    } catch (err) {
        // Another instance created it at the same moment: that's fine
        if (!(err instanceof mongo.MongoServerError && err.code === 11000)) throw err;
    }
};
