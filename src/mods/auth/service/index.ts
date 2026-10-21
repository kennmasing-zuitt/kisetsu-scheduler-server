// Standard Barrel Pattern: the isolated wrapper for service/. Re-exports every
// business-logic function (impl/*) so callers never import the inner files directly:
//   import * as AuthImpl from '<path>/service/index.js';
export * from './impl/changePassword.js';
export * from './impl/getMe.js';
export * from './impl/getSession.js';
export * from './impl/impersonateUser.js';
export * from './impl/login.js';
export * from './impl/logout.js';
export * from './impl/logoutUser.js';
export * from './impl/register.js';
export * from './impl/confirmTwoFactor.js';
export * from './impl/disableTwoFactor.js';
export * from './impl/loginTwoFactor.js';
export * from './impl/regenerateRecoveryCodes.js';
export * from './impl/resetUserTwoFactor.js';
export * from './impl/setupTwoFactor.js';
export * from './impl/twoFactorPolicy.js';
