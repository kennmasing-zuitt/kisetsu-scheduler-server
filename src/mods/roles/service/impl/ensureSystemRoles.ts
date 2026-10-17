import { SYSTEM_ROLES } from '../../db/_roles.enum.js';
import * as RolesOperations from '../../db/repository/index.js';

/** Creates the system roles (super-admin, user) if missing. Called on startup and by the seed. */
export const ensureSystemRoles = async (): Promise<void> => {
    for (const def of SYSTEM_ROLES) await RolesOperations.upsertSystemRole(def);
};
