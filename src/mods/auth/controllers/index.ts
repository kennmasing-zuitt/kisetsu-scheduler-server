import { ChangePasswordHandler } from './handlers/changePassword.js';
import { LoginHandler } from './handlers/login.js';
import { LogoutHandler } from './handlers/logout.js';
import { MeHandler } from './handlers/me.js';
import { RegisterHandler } from './handlers/register.js';

/** Domain Namespace Pattern: every GraphQL handler (controller) of the Auth domain. */
export const AuthHandlers = {
    RegisterHandler,
    LoginHandler,
    LogoutHandler,
    ChangePasswordHandler,
    MeHandler,
} as const;
