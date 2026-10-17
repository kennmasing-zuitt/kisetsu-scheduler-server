// reflect-metadata must load before any type-graphql decorator runs
import 'reflect-metadata';
import { buildSchemaSync } from 'type-graphql';
import { mods } from '../../mods/index.js';
import { HealthResolver } from '../../shared/graphql/health.resolver.js';
import { DateTimeScalar } from '../../shared/graphql/scalars.js';
import { authChecker } from './auth.js';

/** Builds one executable schema from every module's type-graphql resolver classes. */
export function buildSchema() {
    return buildSchemaSync({
        resolvers: [HealthResolver, ...mods.flatMap((m) => m.resolvers)],
        // Any `@Field(() => Date)` is exposed as our ISO-8601 `DateTime` scalar
        scalarsMap: [{ type: Date, scalar: DateTimeScalar }],
        // Input rules live in Zod schemas (see shared/validation.ts), not class-validator
        validate: false,
        // Enables @Authorized() / @Authorized(RoleKey.appAdmin) on resolvers
        authChecker,
    });
}
