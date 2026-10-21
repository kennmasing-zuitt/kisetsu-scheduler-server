import { ChangePasswordHandler } from './handlers/changePassword.js';
import { ImpersonateUserHandler } from './handlers/impersonateUser.js';
import { LoginHandler } from './handlers/login.js';
import { LogoutHandler } from './handlers/logout.js';
import { LogoutUserHandler } from './handlers/logoutUser.js';
import { MeHandler } from './handlers/me.js';
import { RegisterHandler } from './handlers/register.js';
import { SessionHandler } from './handlers/session.js';
import { TwoFactorHandler } from './handlers/twoFactor.js';

/** Domain Namespace Pattern: every GraphQL handler (controller) of the Auth domain. */
export const AuthHandlers = {
    RegisterHandler,
    LoginHandler,
    LogoutHandler,
    ChangePasswordHandler,
    MeHandler,
    SessionHandler,
    LogoutUserHandler,
    ImpersonateUserHandler,
    TwoFactorHandler,
} as const;
