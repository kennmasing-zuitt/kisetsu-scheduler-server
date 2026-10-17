// Standard Barrel Pattern: the isolated wrapper for service/. Re-exports every
// business-logic function (impl/*) so callers never import the inner files directly:
//   import * as AuthImpl from '<path>/service/index.js';
export * from './impl/changePassword.js';
export * from './impl/getMe.js';
export * from './impl/login.js';
export * from './impl/logout.js';
export * from './impl/register.js';
