import type { AppModule } from '../../shared/shared.types.js';
import { AuthHandlers } from './controllers/index.js';

// Module root: the only file other modules should import from.
// Auth has no db/repository/: it owns no collection and works through UsersImpl.
export * as AuthImpl from './service/index.js';
export { AuthHandlers };
export * from './dto/auth.dto.js';
export type * from './db/_auth.types.js';

export const authModule: AppModule = {
    name: 'auth',
    resolvers: Object.values(AuthHandlers),
};
