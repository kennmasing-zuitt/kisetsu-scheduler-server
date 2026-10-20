import type { AppModule } from '../../shared/shared.types.js';
import { RolesHandlers } from './controllers/index.js';

// Module root: the only file other modules should import from.
export * as RolesOperations from './db/repository/index.js';
export * as RolesImpl from './service/index.js';
export { RolesHandlers };
export {
    ADMIN_PERMISSIONS,
    DEFAULT_ROLE_KEY,
    DEFAULT_SCHEDULE_PERMISSIONS,
    PERMISSION_VALUES,
    Permission,
    ROLE_KIND_VALUES,
    RoleKind,
    SUPER_ADMIN_ROLE_KEY,
    SYSTEM_ROLES,
    USER_PERMISSIONS,
} from './db/_roles.enum.js';
export { RoleModel } from './db/role.model.js';
export { RoleKey as RoleKeySchema } from './db/role.zod.js';
export * from './dto/role.dto.js';
export type * from './db/_roles.types.js';
export type { RoleCache } from './service/impl/createRoleCache.js';

export const rolesModule: AppModule = {
    name: 'roles',
    resolvers: Object.values(RolesHandlers),
};
