// reflect-metadata must load before any type-graphql decorator runs
import 'reflect-metadata';
import { GraphQLObjectType, GraphQLSchema, type GraphQLFieldConfigMap } from 'graphql';
import { buildSchemaSync } from 'type-graphql';
import { BOOKING_OPERATIONS, bookingModule } from '../../mods/booking/index.js';
import { mods } from '../../mods/index.js';
import { HealthResolver } from '../../shared/graphql/health.resolver.js';
import { DateTimeScalar } from '../../shared/graphql/scalars.js';
import { authChecker } from './auth.js';

/**
 * type-graphql must build ONE schema per process (building a second one corrupts the parameter
 * metadata of resolvers shared by both). So everything is built once, then split by root field
 * into the staff API and the public booking API below.
 */
let full: GraphQLSchema | undefined;
function buildFullSchema(): GraphQLSchema {
    full ??= buildSchemaSync({
        resolvers: [
            HealthResolver,
            ...mods.flatMap((m) => m.resolvers),
            ...bookingModule.resolvers,
        ],
        // Any `@Field(() => Date)` is exposed as our ISO-8601 `DateTime` scalar
        scalarsMap: [{ type: Date, scalar: DateTimeScalar }],
        // Input rules live in Zod schemas (see shared/validation.ts), not class-validator
        validate: false,
        // Enables @Authorized() / @Authorized(Permission.readUsers) on resolvers
        authChecker,
    });
    return full;
}

type Pick = (name: string) => boolean;

/** A copy of a root type with only some of its fields (resolvers included). */
function pickRoot(root: GraphQLObjectType | null | undefined, keep: Pick) {
    if (!root) return undefined;
    const config = root.toConfig();
    const fields: GraphQLFieldConfigMap<unknown, unknown> = Object.fromEntries(
        Object.entries(config.fields).filter(([name]) => keep(name)),
    );
    return Object.keys(fields).length ? new GraphQLObjectType({ ...config, fields }) : undefined;
}

/** Only the types reachable from the kept root fields end up in the new schema. */
function splitSchema(keep: Pick): GraphQLSchema {
    const schema = buildFullSchema();
    return new GraphQLSchema({
        query: pickRoot(schema.getQueryType(), keep),
        mutation: pickRoot(schema.getMutationType(), keep),
    });
}

const bookingOps = new Set<string>([
    ...BOOKING_OPERATIONS.queries,
    ...BOOKING_OPERATIONS.mutations,
]);

/** The staff API (/graphql): every module except the booking site's operations. */
export function buildSchema() {
    return splitSchema((name) => !bookingOps.has(name));
}

/**
 * The public booking API (/booking/graphql): ONLY the booking site's operations (plus health),
 * so no staff operation exists on that endpoint at all.
 */
export function buildBookingSchema() {
    const schema = splitSchema((name) => name === 'health' || bookingOps.has(name));
    // Guard against the list drifting from the handlers
    const roots = [schema.getQueryType(), schema.getMutationType()];
    const present = new Set(roots.flatMap((t) => (t ? Object.keys(t.getFields()) : [])));
    const missing = [...bookingOps].filter((op) => !present.has(op));
    if (missing.length) throw new Error(`Booking operations not found: ${missing.join(', ')}`);
    return schema;
}
