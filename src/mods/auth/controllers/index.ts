import { RegisterHandler } from './handlers/register.js';

/** Domain Namespace Pattern: every GraphQL handler (controller) of the Auth domain. */
export const AuthHandlers = {
    RegisterHandler,
} as const;
