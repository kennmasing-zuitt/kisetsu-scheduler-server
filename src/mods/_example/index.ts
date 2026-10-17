import type { AppModule } from '../../shared/shared.types.js';
import { ExampleHandlers } from './controllers/index.js';

/**
 * Module root: the only file other modules should import from.
 *
 *   db/                                 Mongoose model, TS types, Zod input rules
 *   db/repository/operations/*.ts       data access, one file per operation
 *   db/repository/index.ts              barrel                 -> ExampleOperations.*
 *   service/impl/*.ts                   business logic, one file per use case
 *   service/index.ts                    barrel                 -> ExampleImpl.*
 *   controllers/handlers/*.ts           GraphQL resolvers, one class per operation
 *   controllers/index.ts                domain namespace       -> ExampleHandlers
 *   dto/                                GraphQL object/input types (type-graphql)
 *
 * Copy this folder to start a new module, then register it in src/mods/index.ts.
 */
export * as ExampleOperations from './db/repository/index.js';
export * as ExampleImpl from './service/index.js';
export { ExampleHandlers };
export * from './dto/example.dto.js';
export type * from './db/_example.types.js';

export const exampleModule: AppModule = {
    name: 'example',
    resolvers: Object.values(ExampleHandlers),
};
