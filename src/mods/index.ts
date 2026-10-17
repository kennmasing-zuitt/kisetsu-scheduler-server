import type { AppModule } from '../shared/shared.types.js';
import { exampleModule } from './_example/index.js';
import { authModule } from './auth/index.js';
import { userModule } from './users/index.js';

// Each module contributes its resolver classes to the single GraphQL schema
export const mods: AppModule[] = [exampleModule, authModule, userModule];
