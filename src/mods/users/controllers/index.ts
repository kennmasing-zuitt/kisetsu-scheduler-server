import { ListUsersHandler } from './handlers/list.js';
import { UserFieldsHandler } from './handlers/userFields.js';

/** Domain Namespace Pattern: every GraphQL handler (controller) of the Users domain. */
export const UsersHandlers = {
    ListUsersHandler,
    UserFieldsHandler,
} as const;
