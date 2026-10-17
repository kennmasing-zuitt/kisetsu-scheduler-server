# express-typescript-graphql-boilerplate-server

Express 5 + TypeScript + **Apollo Server 5** + **type-graphql** + MongoDB/Mongoose boilerplate.
GraphQL port of `express-typescript-boilerplate-server`: every REST route is now a GraphQL
query or mutation served from a single endpoint, `POST /graphql`.

## Quick start

```bash
npm install
cp .env.example .env            # then edit MONGO_URI etc.
npm run seed                    # optional: admin@example.com / user@example.com
npm run dev                     # http://localhost:3000/graphql
```

In development, opening `http://localhost:3000/graphql` in a browser shows **Apollo Sandbox**
(an in-browser IDE with schema docs and autocomplete). It is disabled in production, along with
introspection.

## REST → GraphQL map

| Before (REST)                        | Now (GraphQL)                                                 |
| ------------------------------------ | ------------------------------------------------------------- |
| `POST /api/v1/auth/register`         | `mutation register(input: RegisterInput!)`                    |
| `GET  /api/v1/users?page=&limit=`    | `query users(page: Int, limit: Int)`                          |
| `GET  /api/v1/example/readExample`   | `query examples(page: Int, limit: Int)`                       |
| —                                    | `query example(id: ID!)`                                      |
| `POST /api/v1/example/createExample` | `mutation createExample(input: CreateExampleInput!)`          |
| `POST /api/v1/example/updateExample` | `mutation updateExample(id: ID!, input: UpdateExampleInput!)` |
| `POST /api/v1/example/deleteExample` | `mutation deleteExample(id: ID!): Boolean!`                   |
| `GET  /health`                       | kept as a plain liveness probe, plus `query health`           |

Print the whole schema with `npm run schema:print` (or `npm run schema:print -- schema.graphql`).

### Example

```bash
curl -s localhost:3000/graphql -H 'Content-Type: application/json' -d '{
  "query": "mutation ($input: RegisterInput!) { register(input: $input) { message user { id email roles { key } } } }",
  "variables": { "input": { "name": "Kenn", "email": "kenn@example.com", "password": "Password123!" } }
}'
```

## Postman

`postman/express-typescript-graphql-boilerplate.postman_collection.json` covers every query and
mutation, including the error cases. Each request has tests.

1. Postman → **Import** → select the file.
2. Start the server (`npm run dev`). The collection's `baseUrl` variable defaults to
   `http://localhost:3001`; change it in the collection's **Variables** tab if needed.
3. **Run collection**, or send requests top to bottom (`createExample` saves `exampleId` for the
   requests after it).

From the terminal: `npx newman run postman/express-typescript-graphql-boilerplate.postman_collection.json`.

Each run makes 2 deliberate failed `register` calls, which count towards `AUTH_RATE_LIMIT_MAX`
(5 per 15 min in `.env.example`), so a third run within 15 minutes gets `TOO_MANY_REQUESTS`.
Restarting the dev server resets the counter.

## Errors

GraphQL answers `200` with an `errors` array. Each error carries a machine-readable code and the
HTTP-equivalent status, so client logic written against the REST API maps over directly:

```json
{
    "errors": [
        {
            "message": "That email is already registered.",
            "path": ["register"],
            "extensions": { "code": "EMAIL_TAKEN", "status": 409, "requestId": "…" }
        }
    ],
    "data": null
}
```

Codes: `VALIDATION_ERROR` (Zod issues in `extensions.details`), `NOT_FOUND`, `EMAIL_TAKEN`,
`CONFLICT`, `INVALID_ID`, `TOO_MANY_REQUESTS`, `INTERNAL_SERVER_ERROR` (message hidden in
production), plus Apollo's own `GRAPHQL_VALIDATION_FAILED`, `BAD_USER_INPUT`, `GRAPHQL_PARSE_FAILED`.

## Project layout

```
src/
  server.ts                     connect DB -> start HTTP + Apollo -> graceful shutdown
  core/
    config/                     env (envalid), cors, GRAPHQL_PATH
    graphql/                    Apollo server, buildSchema (type-graphql), context, formatError,
                                plugins, middleware/RateLimit
    loaders/                    app (Express + Apollo), startExpress, Mongo, gracefulShutdown
    middleware/                 requestId, requestLogger, rateLimit, notFound, errorHandler
  shared/                       AppError classes, pagination (Zod + PaginationArgs/PaginatedResponse),
                                Zod helpers, DateTime scalar, HealthResolver
  mods/<module>/
    db/                         Mongoose model, TS types, enums, Zod input rules
      repository/               data access: operations/*.ts + index.ts
    service/                    business logic: impl/*.ts + index.ts
    controllers/                GraphQL resolvers: handlers/*.ts + index.ts
    dto/                        GraphQL @ObjectType / @InputType classes
    tests/
    index.ts                    module root (public API + AppModule)
  mods/index.ts                 module registry
```

### Module structure (sub-folder isolation)

Each layer is a wrapper folder holding an inner folder of one-file-per-operation implementations
plus a single `index.ts` beside it, never inside it. The inner files use the same name in every
layer an operation passes through:

```
mods/_example/
  db/
    repository/
      operations/
        createExample.ts        ExampleModel.create(...)
        deleteExample.ts
        findExampleById.ts
        readExample.ts
        updateExample.ts
      index.ts                  isolated wrapper (barrel)        -> ExampleOperations
    _example.types.ts
    example.model.ts
    example.zod.ts
  service/
    impl/
      createExample.ts          rules, NotFound checks, calls ExampleOperations.createExample
      ...
    index.ts                    isolated wrapper (barrel)        -> ExampleImpl
  controllers/
    handlers/
      createExample.ts          @Mutation createExample -> Zod -> ExampleImpl.createExample
      exampleFields.ts          @FieldResolver id
      ...
    index.ts                    isolated wrapper (namespace)     -> ExampleHandlers
  dto/example.dto.ts
  index.ts                      module root
```

Calls only go downwards: `controllers -> service -> db/repository -> model`, and always through
the wrapper `index.ts`, never into another layer's inner folder.

| File                     | Pattern              | Looks like                                                                              |
| ------------------------ | -------------------- | --------------------------------------------------------------------------------------- |
| `db/repository/index.ts` | Standard barrel      | `export * from './operations/createExample.js'`                                         |
| `service/index.ts`       | Standard barrel      | `export * from './impl/createExample.js'`                                               |
| `controllers/index.ts`   | Domain namespace     | `export const ExampleHandlers = { CreateExampleHandler, ... } as const`                 |
| `index.ts` (root)        | Combined module root | `export * as ExampleOperations / ExampleImpl`, `ExampleHandlers`, DTOs, `exampleModule` |

Inside a module, wrappers are imported as namespaces so the layer stays visible at the call site:

```ts
// service/impl/updateExample.ts
import * as ExampleOperations from '../../db/repository/index.js';
await ExampleOperations.updateExample(data);
```

Other modules import **only from the module root**, never from inner folders:

```ts
import { UsersImpl, UserObject, type UserDocument } from '../../users/index.js';
```

The root registers every handler automatically (`resolvers: Object.values(ExampleHandlers)`),
so a new handler only needs adding to `controllers/index.ts`.

**Adding a module:** copy `src/mods/_example`, rename the files and `Example*` names, and add the
module to `src/mods/index.ts`. The schema is generated from the decorated classes; there is no
hand-written SDL.

### type-graphql conventions

- **Always pass the type function**: `@Field(() => String)`, `@Arg('id', () => ID)`,
  `@Query(() => UserPage)`. `tsx` and Vitest compile with esbuild/oxc, which don't emit
  decorator metadata, so type-graphql can't infer types there. Explicit types make dev, tests
  and the `tsc` build behave the same.
- **GraphQL classes describe shape, Zod enforces rules.** Input classes (`@InputType`) have no
  validation decorators; resolvers call `parseInput(ZodSchema, input)`, which also applies
  transforms (trim, lowercase). class-validator is not installed (`validate: false`).
- **Name collisions:** GraphQL classes are suffixed (`UserObject`, `RegisterInputType`) and given
  their public name in the decorator (`@ObjectType('User')`), so they don't clash with the
  Mongoose/Zod types of the same name.
- **`id`** is a `@FieldResolver` in `controllers/handlers/<type>Fields.ts` (`String(doc._id)`), so impl
  functions can return either Mongoose documents or `.lean()` objects.
- **Pagination:** `@Args(() => PaginationArgs)` and
  `class UserPage extends PaginatedResponse(UserObject) {}`.
- `reflect-metadata` is imported first in `server.ts`, `core/graphql/schema.ts`, the seed/schema
  scripts and the test setup. Any new entry point that imports a module root needs it too.

## Security notes

- `/graphql` is rate limited per IP (`API_RATE_LIMIT_MAX` per 15 min).
- `register` has its own limiter (`AUTH_RATE_LIMIT_MAX` failed attempts per 15 min), applied with
  `@UseMiddleware(RateLimit(authLimiter))`; reuse it for `login`.
- Apollo's CSRF prevention is on: browsers must send `Content-Type: application/json` or the
  `apollo-require-preflight` header.
- The `User` type has no password field, so the hash can't be selected by any query.
- `users` is currently public, as `GET /api/v1/users` was. Once login/JWT is implemented, put the
  user on the context and use type-graphql's `@Authorized(RoleKey.appAdmin)` with an
  `authChecker` in `buildSchema`.

## Scripts

| Script                        | What it does                                     |
| ----------------------------- | ------------------------------------------------ |
| `dev`                         | Watch mode with `.env`                           |
| `build` / `start`             | Compile to `dist/` / run the compiled server     |
| `test` / `test:run`           | Vitest (needs MongoDB; copy `.env.test.example`) |
| `typecheck`, `lint`, `format` | The usual                                        |
| `seed` / `seed:reset`         | Seed demo users (refuses in production)          |
| `schema:print`                | Print the GraphQL SDL                            |
