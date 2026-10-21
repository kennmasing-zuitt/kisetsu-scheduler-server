// Standard Barrel Pattern: the isolated wrapper for db/repository/. Re-exports every
// data-access operation (operations/*) so callers never import the inner files directly:
//   import * as UsersOperations from '<path>/db/repository/index.js';
export * from './operations/countByRole.js';
export * from './operations/create.js';
export * from './operations/findAll.js';
export * from './operations/findByEmail.js';
export * from './operations/findByEmailWithPassword.js';
export * from './operations/findById.js';
export * from './operations/findByIdWithPassword.js';
export * from './operations/incrementTokenVersion.js';
export * from './operations/setAccess.js';
export * from './operations/updatePassword.js';
export * from './operations/twoFactor.js';
