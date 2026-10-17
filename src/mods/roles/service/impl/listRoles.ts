import type { Role } from '../../db/_roles.types.js';
import * as RolesOperations from '../../db/repository/index.js';

export const listRoles = async (): Promise<Role[]> => RolesOperations.findAllRoles();
