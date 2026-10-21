// Standard Barrel Pattern: the isolated wrapper for service/. Re-exports every
// business-logic function (impl/*) so callers never import the inner files directly:
//   import * as UsersImpl from '<path>/service/index.js';
export * from './impl/countByRole.js';
export * from './impl/create.js';
export * from './impl/findByEmail.js';
export * from './impl/findByEmailWithPassword.js';
export * from './impl/findById.js';
export * from './impl/findByIdWithPassword.js';
export * from './impl/incrementTokenVersion.js';
export * from './impl/list.js';
export * from './impl/updateUserAccess.js';
export * from './impl/updatePassword.js';
export * from './impl/twoFactor.js';
