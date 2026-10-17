// Standard Barrel Pattern: the isolated wrapper for db/repository/.
//   import * as RolesOperations from '<path>/db/repository/index.js';
export * from './operations/createRole.js';
export * from './operations/deleteRole.js';
export * from './operations/findAllRoles.js';
export * from './operations/findRoleByKey.js';
export * from './operations/findRolesByKeys.js';
export * from './operations/updateRole.js';
export * from './operations/upsertSystemRole.js';
