import { CreateRoleHandler } from './handlers/createRole.js';
import { DeleteRoleHandler } from './handlers/deleteRole.js';
import { ListRolesHandler } from './handlers/listRoles.js';
import { RoleFieldsHandler } from './handlers/roleFields.js';
import { UpdateRoleHandler } from './handlers/updateRole.js';

/** Domain Namespace Pattern: every GraphQL handler (controller) of the Roles domain. */
export const RolesHandlers = {
    ListRolesHandler,
    CreateRoleHandler,
    UpdateRoleHandler,
    DeleteRoleHandler,
    RoleFieldsHandler,
} as const;
