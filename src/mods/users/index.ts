import type { AppModule } from '../../shared/shared.types.js';
import { UsersHandlers } from './controllers/index.js';

// Module root: the only file other modules should import from.
export * as UsersOperations from './db/repository/index.js';
export * as UsersImpl from './service/index.js';
export { UsersHandlers };
export * from './dto/user.dto.js';
export { RoleKey, ROLE_KEY_VALUES } from './db/_users.enum.js';
export { UserModel } from './db/user.model.js';
export type * from './db/_users.types.js';

export const userModule: AppModule = {
    name: 'users',
    resolvers: Object.values(UsersHandlers),
};
