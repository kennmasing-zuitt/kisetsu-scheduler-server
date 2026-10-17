// Standard Barrel Pattern: the isolated wrapper for db/repository/. Re-exports every
// data-access operation (operations/*) so callers never import the inner files directly:
//   import * as UsersOperations from '<path>/db/repository/index.js';
export * from './operations/create.js';
export * from './operations/findAll.js';
export * from './operations/findByEmail.js';
export * from './operations/setRoles.js';
