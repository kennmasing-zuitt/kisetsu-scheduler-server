# express-typescript-graphql-boilerplate-server

Express 5 + TypeScript + **Apollo Server 5** + **type-graphql** + MongoDB/Mongoose boilerplate.
GraphQL port of `express-typescript-boilerplate-server`: every REST route is now a GraphQL
query or mutation served from a single endpoint, `POST /graphql`.

## Quick start

```bash
npm install
cp .env.example .env            # then edit MONGO_URI etc.
npm run seed                    # roles + a super admin, support admin and regular user
npm run dev                     # http://localhost:2200/graphql
```

In development, opening `http://localhost:2200/graphql` in a browser shows **Apollo Sandbox**
(an in-browser IDE with schema docs and autocomplete). It is disabled in production, along with
introspection.

## REST → GraphQL map

| Before (REST)                        | Now (GraphQL)                                                 |
| ------------------------------------ | ------------------------------------------------------------- |
| `POST /api/v1/auth/register`         | `mutation register(input: RegisterInput!)`                    |
| —                                    | `mutation login(input: LoginInput!)`                          |
| —                                    | `query me` (auth)                                             |
| —                                    | `mutation changePassword(input: ChangePasswordInput!)` (auth) |
| —                                    | `mutation logout` (auth)                                      |
| —                                    | `query session` (auth)                                        |
| —                                    | `mutation logoutUser(userId: ID!)` (logoutUsers)              |
| —                                    | `mutation impersonateUser(userId, reason)` (impersonateUsers) |
| —                                    | `mutation setUserAccess(userId, input)` (manageUserAccess)    |
| —                                    | `query roles` / `role(key)` (readRoles)                       |
| —                                    | `mutation createRole / updateRole / deleteRole` (manageRoles) |
| —                                    | `query auditLogs(...)` (readAuditLogs)                        |
| `GET  /api/v1/users?page=&limit=`    | `query users(page: Int, limit: Int)` (readUsers)              |
| `GET  /api/v1/example/readExample`   | `query examples(page: Int, limit: Int)`                       |
| —                                    | `query example(id: ID!)`                                      |
| `POST /api/v1/example/createExample` | `mutation createExample(input: CreateExampleInput!)`          |
| `POST /api/v1/example/updateExample` | `mutation updateExample(id: ID!, input: UpdateExampleInput!)` |
| `POST /api/v1/example/deleteExample` | `mutation deleteExample(id: ID!): Boolean!`                   |
| `GET  /health`                       | kept as a plain liveness probe, plus `query health`           |
| —                                    | Schedule: see [Schedule](#schedule)                           |

Print the whole schema with `npm run schema:print` (or `npm run schema:print -- schema.graphql`).

### Example

```bash
curl -s localhost:2200/graphql -H 'Content-Type: application/json' -d '{
  "query": "mutation ($input: RegisterInput!) { register(input: $input) { message token user { id email role { key perms } } } }",
  "variables": { "input": { "name": "Kenn", "email": "kenn@example.com", "password": "Password123!" } }
}'
```

## Postman

`postman/express-typescript-graphql-boilerplate.postman_collection.json` covers every query and
mutation, including the error cases. Each request has tests.

1. Postman → **Import** → select the file.
2. Start the server (`npm run dev`). The collection's `baseUrl` variable defaults to
   `http://localhost:3001`; change it in the collection's **Variables** tab if needed.
3. **Run collection**, or send requests top to bottom: `register`, `login` and `changePassword`
   save `token` for the protected requests, and `createExample` saves `exampleId`.

From the terminal: `npx newman run postman/express-typescript-graphql-boilerplate.postman_collection.json`.

Each run makes 4 deliberate failed auth calls (register, login, changePassword), which count
towards `AUTH_RATE_LIMIT_MAX` (5 per 15 min in `.env.example`), so a second run within 15 minutes
gets `TOO_MANY_REQUESTS`. For local testing set `AUTH_RATE_LIMIT_MAX=50` in `.env`, or restart the
dev server to reset the counter.

The Users, Example, Roles and Admin folders log in as the seeded accounts, so run `npm run seed`
first. Only run the collection against a local or dev database: it creates and deletes a role and
signs the test user out.

## Authentication

JWT access tokens (HS256), sent as `Authorization: Bearer <token>`.

| Operation               | Auth | Returns                                    | Errors                                                      |
| ----------------------- | ---- | ------------------------------------------ | ----------------------------------------------------------- |
| `register(input)`       | no   | `{ message, token, user }`                 | `EMAIL_TAKEN` 409, `VALIDATION_ERROR` 400                   |
| `login(input)`          | no   | `{ token, user }`                          | `INVALID_CREDENTIALS` 401 (unknown email or wrong password) |
| `me`                    | yes  | `User`                                     | `UNAUTHENTICATED` 401                                       |
| `changePassword(input)` | yes  | `{ token, user }`                          | `WRONG_PASSWORD` 403, `VALIDATION_ERROR` 400                |
| `logout`                | yes  | `true`                                     | `UNAUTHENTICATED` 401                                       |
| `session`               | yes  | `{ user, effectivePerms, impersonatedBy }` | `UNAUTHENTICATED` 401                                       |

```graphql
mutation {
    login(input: { email: "user@example.com", password: "User123!" }) {
        token
        user {
            id
            email
            role {
                key
                perms
            }
        }
    }
}
```

**How it works**

- **Token versioning.** Each user has `tokenVersion` (starts at 0). Tokens are signed with
  `{ sub: user.id, ver: user.tokenVersion, role }` and expire after `JWT_EXPIRES_IN`.
- **verifyToken** (`src/core/middleware/verifyToken.ts`) runs in front of `/graphql`. With no
  `Authorization` header the request continues anonymously. With a token, it verifies the
  signature (`algorithms: ['HS256']` only) and expiry, loads the user's current `tokenVersion`, and
  rejects the whole request with **HTTP 401** `UNAUTHENTICATED` if `ver` doesn't match. On success
  it maps `sub` to `id` once (`req.user = { id, role, roleKind, perms }`, with `perms` the
  effective permissions), which resolvers get as `ctx.user` or via
  `@CurrentUser()`.
- **Protecting a resolver:** add `@Authorized()` (any signed-in user) or
  `@Authorized(Permission.readUsers)` (permission check, 403 `FORBIDDEN`), and take the caller
  with `@CurrentUser() user: AuthUser`. See [Roles and permissions](#roles-and-permissions-rbac).
- **Login** uses `findByEmailWithPassword`, the only lookup that selects the hash
  (`select: false` on the field). Unknown emails still run a bcrypt compare, so response time
  doesn't reveal which emails exist.
- **Logout** increments `tokenVersion`, so the client should also delete its stored token.
  **This signs the user out on every device.** Per-device logout needs stored refresh tokens
  (one record per session), which this boilerplate doesn't include.
- **Change password** checks the current password, stores the new hash and increments
  `tokenVersion` in one update (signing out other devices), then returns a fresh token for the
  device that made the change.
- **Never logged:** the logger and the Mongoose debug output redact any key ending in
  `password`, `token`, `secret`, `authorization` or `cookie`. Tokens are never put in error
  messages.
- `register`, `login` and `changePassword` share the auth rate limiter (failed attempts only).

## Roles and permissions (RBAC)

Access is role-based. A **role** is a document in the `Role` collection: a named set of
permissions. Each **user** references one role by key (`user.role`) and can have per-user
`extraPerms` on top of it:

```
effective permissions = role.perms + user.extraPerms
```

computed in one place, `resolvePermissions()` in `src/shared/auth/permissions.ts`.

- **Role kinds.** Every role is `admin` or `user` kind. Admin permissions only take effect
  through an admin-kind role: they're dropped from user-kind roles and from the extras of users on
  them, and the API rejects that combination.
- **`superAdmin`** (on an admin-kind role) implies every permission.
- **System roles** are created on startup if missing and can't be deleted: `super-admin` (holds
  `superAdmin`; fully locked) and `user` (default for new accounts: `createExample`,
  `updateExample`, `updateTherapist`, `createBooking`, `updateBooking`, `deleteBooking`).
- **Checked on every request.** `verifyToken` loads the user and their role and computes the
  effective permissions, so changing a role, a user's role or their extras applies on the next
  request, with no re-login. `query session { effectivePerms }` tells a frontend what to show.

### Permissions

Defined in `src/mods/roles/db/_roles.enum.ts`:

| Permission         | Kind  | Allows                                   |
| ------------------ | ----- | ---------------------------------------- |
| `superAdmin`       | admin | Everything                               |
| `readUsers`        | admin | `users`                                  |
| `manageUserAccess` | admin | `setUserAccess`                          |
| `readRoles`        | admin | `roles`, `role`                          |
| `manageRoles`      | admin | `createRole`, `updateRole`, `deleteRole` |
| `logoutUsers`      | admin | `logoutUser`                             |
| `impersonateUsers` | admin | `impersonateUser`                        |
| `readAuditLogs`    | admin | `auditLogs`                              |
| `createExample`    | user  | `createExample`                          |
| `updateExample`    | user  | `updateExample`                          |
| `deleteExample`    | user  | `deleteExample`                          |
| `createTherapist`  | user  | `createTherapist`                        |
| `updateTherapist`  | user  | `updateTherapist` (days off, leave)      |
| `deleteTherapist`  | user  | `deleteTherapist`                        |
| `createRoom`       | user  | `createRoom`                             |
| `updateRoom`       | user  | `updateRoom`                             |
| `deleteRoom`       | user  | `deleteRoom`                             |
| `createBooking`    | user  | `createBooking`                          |
| `updateBooking`    | user  | `updateBooking`                          |
| `deleteBooking`    | user  | `deleteBooking`                          |
| `createService`    | user  | `createService`                          |
| `updateService`    | user  | `updateService` (prices, archive)        |
| `deleteService`    | user  | `deleteService` (never-booked only)      |
| `readReports`      | user  | `salesReport`                            |
| `readClients`      | user  | `clients`, `client`, `clientBookings`    |
| `updateClient`     | user  | `updateClient` (name, mobile, notes)     |
| `createPromo`      | user  | `createPromo`                            |
| `updatePromo`      | user  | `updatePromo` (incl. archive / activate) |
| `deletePromo`      | user  | `deletePromo` (never-used only)          |

**Adding a permission:** add it to `Permission` (and to `ADMIN_PERMISSIONS` or
`USER_PERMISSIONS`), put `@Authorized(Permission.yourPerm)` on the resolver, then grant it to a
role with `updateRole`.

### Hierarchy rules

Admins are ranked by what they hold. Enforced in `assertCanManageRole` and
`UsersImpl.updateUserAccess`:

1. You can only put permissions you hold into a role, or hand them out through a role assignment
   or `extraPerms`.
2. Only a super admin can create, edit or delete admin-kind roles, assign an admin-kind role, or
   change an admin's access.
3. Nobody can change their own access.
4. `super-admin` can't be edited; system roles can't be deleted; a role still assigned to users
   can't be deleted (`ROLE_IN_USE`, reassign them first). A role's `key` and `kind` are
   immutable.
5. Every change is written to the audit log with before/after values.

### Seeded roles and accounts

`npm run seed` creates the system roles, a custom `support` role, one account each, the sample
schedule (therapists Ana, Ben, Carla and Dana; Room 1–4) and the five services with their prices
(valid from 2025-01-01; existing services are never overwritten). On a database seeded before the schedule
existed, it also adds the schedule permissions to the `user` role (system roles are otherwise never
overwritten):

| Email                 | Password      | Role          | Effective permissions                                           |
| --------------------- | ------------- | ------------- | --------------------------------------------------------------- |
| `admin@example.com`   | `Admin123!`   | `super-admin` | all                                                             |
| `support@example.com` | `Support123!` | `support`     | `readUsers`, `logoutUsers`, `impersonateUsers`, `readAuditLogs` |
| `user@example.com`    | `User123!`    | `user`        | `createExample`, `updateExample`, `updateTherapist`, bookings   |

### Upgrading an existing database

Run `npm run migrate:access` once. It converts users from the older shapes
(`roles: [{ key: 'appAdmin' | 'admin' | 'user' }]`, optionally with `perms`) to
`role` + `extraPerms`, without anyone gaining or losing access:

- `appAdmin`, or an admin holding `superAdmin` → `super-admin`
- an admin with a limited permission set → a generated `migrated-admin-N` role per distinct set
  (rename or merge them afterwards with the role mutations)
- everyone else → `user`, with any permissions beyond the `user` role kept as `extraPerms`

Migrated users' tokens are revoked. It's safe to run twice.

## Admin operations

| Operation                                           | Permission         | Returns                                      | Errors                                                |
| --------------------------------------------------- | ------------------ | -------------------------------------------- | ----------------------------------------------------- |
| `roles`, `role(key)`                                | `readRoles`        | `[Role]`, `Role`                             |                                                       |
| `createRole(input)`                                 | `manageRoles`      | `Role`                                       | `ROLE_KEY_TAKEN` 409, `FORBIDDEN`, `VALIDATION_ERROR` |
| `updateRole(key, input)`                            | `manageRoles`      | `Role`                                       | `SYSTEM_ROLE_LOCKED`, `FORBIDDEN`, `NOT_FOUND`        |
| `deleteRole(key)`                                   | `manageRoles`      | `true`                                       | `ROLE_IN_USE` 409, `SYSTEM_ROLE_LOCKED`, `NOT_FOUND`  |
| `setUserAccess(userId, { role, extraPerms })`       | `manageUserAccess` | `User`                                       | `CANNOT_MODIFY_SELF`, `FORBIDDEN`, `NOT_FOUND`        |
| `impersonateUser(userId, reason)`                   | `impersonateUsers` | `{ token, expiresAt, user, impersonatedBy }` | `CANNOT_IMPERSONATE_ADMIN`, `NOT_FOUND`               |
| `logoutUser(userId)`                                | `logoutUsers`      | `true`                                       | `NOT_FOUND` 404                                       |
| `auditLogs(page, limit, action, actorId, targetId)` | `readAuditLogs`    | `AuditLogPage`                               |                                                       |

All return 403 `FORBIDDEN` without the permission. Every mutation here is recorded in the audit log.

### Impersonation (support access without passwords)

`impersonateUser(userId, reason)` gives an admin a token that acts as a user, for support and
debugging. There is deliberately **no master password**: access is tied to the admin's own account
and permissions, and every session is attributable.

- **Short-lived:** the token expires after `IMPERSONATION_TOKEN_TTL` (default `15m`).
- **Tied to the admin:** the token carries `act: { sub: adminId, ver }`. On every request
  `verifyToken` checks the admin still exists, still has the same `tokenVersion` and still holds
  `impersonateUsers`. Change their role, or log the admin out, and the session ends at once
  (401 "Impersonation session has ended").
- **Revocable from the user's side:** `logoutUser` or a password change ends it too.
- **Admins can't be impersonated**, and impersonation tokens can't call `logout`,
  `changePassword`, `impersonateUser`, `setUserAccess` or the role mutations
  (403 `IMPERSONATION_NOT_ALLOWED`).
- **Audited:** the start is stored in the audit log with the required reason (5-500 chars), and
  every request made with the token logs `Impersonated request { adminId, userId }`.
- **Visible:** `query session { impersonatedBy { email } }` returns the admin, so a frontend can
  show an "acting as" banner.

### Signing users out

`logout` signs the caller out of every device. `logoutUser(userId)` lets an admin do the same to
someone else (compromised account, departing staff, lost device). To sign **everyone** out, for
example after a suspected token leak, rotate `JWT_SECRET` and redeploy: every existing token
becomes invalid with no database write.

## Schedule

`src/mods/schedule` (same layout as `_example`) holds therapists, rooms and bookings. Every query
needs a signed-in user; mutations need the permission named after them.

| Operation                                               | Returns       | Notes                                  |
| ------------------------------------------------------- | ------------- | -------------------------------------- |
| `therapists` / `therapist(id)`                          | `Therapist`   | `{ id, name, offDays, leaveDates }`    |
| `createTherapist(input)` / `updateTherapist(id, input)` | `Therapist`   | lists replace the stored ones          |
| `deleteTherapist(id)`                                   | `Boolean`     | refused with upcoming bookings         |
| `rooms` / `room(id)`                                    | `Room`        | `{ id, name, color }`                  |
| `createRoom` / `updateRoom` / `deleteRoom`              | `Room`/`Bool` | `#RRGGBB`; delete like deleteTherapist |
| `bookings(from, to, therapistId?, roomId?)`             | `[Booking!]!` | overlapping `[from, to)`, max 62 days  |
| `booking(id)`                                           | `Booking`     | `{ id, client, clientMobile, ... }`    |
| `createBooking(input)` / `updateBooking(id, input)`     | `Booking`     | rules below                            |
| `deleteBooking(id)`                                     | `Boolean`     | cancels the booking                    |

### Booking input

`createBooking(input)` takes the client by **mobile number**, not by name:

| Field                                                | Notes                                                              |
| ---------------------------------------------------- | ------------------------------------------------------------------ |
| `clientMobile`                                       | required; any PH format or international `+…` (see below)          |
| `clientFirstName` / `clientLastName`                 | first name required only when the number is new; ignored otherwise |
| `isRequested`                                        | the client asked for this therapist by name (default `false`)      |
| `promoCode`                                          | optional, one per booking                                          |
| `therapistId`, `roomId`, `serviceId`, `start`, `end` | as before                                                          |

`updateBooking(id, input)` takes the same fields, all optional. Sending `clientMobile` moves the
booking to that client (created if new); `promoCode: ""` removes the promo. A booking keeps a copy
of the client's name and mobile (`client`, `clientMobile`) next to `clientId`, so the calendar
doesn't need a join; `updateClient` keeps those copies in sync.

**Mobile numbers** are stored in E.164 (`+639171234567`). Philippine mobiles are accepted as
`09171234567`, `9171234567`, `639171234567`, `+639171234567`, `00639171234567`, with any spaces,
dashes, dots or brackets. Other countries need `+` (or `00`) and the country code. A `+63` number
that isn't a mobile (`+632…` landline) is refused (`VALIDATION_ERROR`). See `src/shared/mobile.ts`.

### Clients

A `Client` (`{ mobile (unique), firstName, lastName, notes }`) is created automatically the first
time a booking uses a new mobile number; a new number without `clientFirstName` is refused
(`VALIDATION_ERROR` "Enter the first name: this mobile number is a new client"). Each client comes
with `stats`: `visits` (bookings that have ended), `upcoming`, `firstVisit`, `lastVisit`,
`requested` (bookings where they asked for a therapist) and `favouriteTherapistId`.

| Operation                               | Notes                                                      |
| --------------------------------------- | ---------------------------------------------------------- |
| `clients(search, page, pageSize)`       | name words, or 3+ digits of the mobile; `readClients`      |
| `client(id)` / `clientByMobile(mobile)` | `null` when not found (any mobile format)                  |
| `clientBookings(clientId, limit)`       | newest first                                               |
| `updateClient(id, input)`               | `CLIENT_MOBILE_TAKEN` if the new number belongs to another |

### Promo codes

A `Promo` is `{ code, description, discountType: percent | amount, value, validFrom, validTo,
serviceIds, isActive }` (`serviceIds: []` = every service; `validTo: null` = no end date). The
discount is taken off the booking's price for its date: percent is rounded to the centavo, an
amount is capped at the price. Like prices, the discount isn't stored on the booking: reports
compute it every time from the promo and the price rule.

A code applies when it exists, is active, the booking's date is inside its period and the service
is covered, otherwise `PROMO_NOT_APPLICABLE` (e.g. "AKI100 doesn't apply to Fuyu"). The check
runs on create, when the code changes, and when an update moves the booking to another date or
service. Archiving a promo (`isActive: false`) stops new uses; bookings that already have it keep it.

**Locked terms:** once any booking uses a promo, its `code`, `discountType`, `value` and
`serviceIds` can't change (`PROMO_LOCKED`), so past reports don't change under you. The
description, period and active flag stay editable. To offer different terms, create a new promo.
`PromoObject` exposes `timesUsed` and `isLocked`.

| Operation                                       | Notes                                                    |
| ----------------------------------------------- | -------------------------------------------------------- |
| `promos(includeArchived)` / `promo(code)`       | signed-in users                                          |
| `createPromo(input)` / `updatePromo(id, input)` | `PROMO_CODE_TAKEN` on a duplicate code                   |
| `deletePromo(id)`                               | only never-used promos (`PROMO_IN_USE`); archive instead |

### Services and prices

A `Service` (Fuyu, Natsu, Haru, Shiki, Aki) holds a list of **price rules**:

| Field         | Meaning                                                                      |
| ------------- | ---------------------------------------------------------------------------- |
| `durationMin` | length the price is for (60, 80, …); `null` = any length (Aki)               |
| `days`        | weekdays it applies to, 0 = Sunday; `[]` = every day (Aki: Mon–Thu, Fri–Sun) |
| `amount`      | price in PHP                                                                 |
| `validFrom`   | first day of the price period, `YYYY-MM-DD` in `SCHEDULE_TIMEZONE`           |
| `validTo`     | last day (inclusive); `null` = still the current price                       |

Rules of a service may not overlap (same period, days and length), so a booking matches at most
one. **To change a price**, set `validTo` on the current rule to the last day of the old price and
add a rule with the new amount from the next day. Nothing is stored on the bookings: reports look
up the rule for each booking's date every time they run, so a 2025 report uses 2025 prices, and
correcting an old period corrects old reports. A service that has bookings can't be deleted
(`SERVICE_IN_USE`); archive it with `updateService(isActive: false)` instead.

| Operation                                           | Notes                            |
| --------------------------------------------------- | -------------------------------- |
| `services(includeArchived)` / `service(id)`         | signed-in users                  |
| `createService(input)` / `updateService(id, input)` | `prices` replaces the whole list |
| `deleteService(id)`                                 | only never-booked services       |

Bookings now need a `serviceId`, and the service must have a price for the booking's length on
its date (`VALIDATION_ERROR` "Fuyu has no price for 90 minutes on … (available: 60, 80 minutes)").
Bookings made before services existed have none and show up as unpriced in reports.

### Sales reports

`salesReport(period: daily | weekly | monthly | annual, date: "YYYY-MM-DD", includeUpcoming = false)`
(`src/mods/reports`, needs `readReports`) covers that day, or the week (Monday–Sunday), month or
year that contains `date`. Each booking counts on the day it starts and is priced at the rule that
prevailed on that day. It returns totals, per-therapist service counts and revenue, per-service
totals, `lines` showing each (service, length, price) combination, a chart `series` (hours of
opening hours for daily, days for weekly/monthly, months for annual) and the bookings that
couldn't be priced (`noService`, `noPrice`). By default only bookings that have ended count
(services rendered); `includeUpcoming` adds the rest.

Money comes as `grossRevenue` (list price), `discounts` (promos) and `revenue` (net = gross −
discounts) on the totals, each therapist, service and line. Therapists also get `requested` and
`requestRate` (share of their services the client asked for them by name). `promos` lists each
code used with its bookings and discount total. `clients` gives `uniqueClients`, `newClients`
(first ever booking falls in the period), `returningClients`, `noClient` (bookings made before
mobiles were required) and the `top` 10 clients by bookings, with their revenue and all-time visits.

**Booking rules** (`service/impl/assertBookingAllowed.ts`, checked on create and on the merged
result of every update):

- ends after it starts, at most 600 minutes (`VALIDATION_ERROR`)
- the therapist and room exist (`NOT_FOUND`)
- fits between `SCHEDULE_OPENING_TIME` and `SCHEDULE_CLOSING_TIME` on one day (`VALIDATION_ERROR`)
- the therapist isn't on a weekly day off or on leave (`THERAPIST_UNAVAILABLE`)
- no overlapping booking for the therapist (`THERAPIST_DOUBLE_BOOKED`) or the room (`ROOM_TAKEN`);
  back-to-back is fine
- the service exists, is offered (archived services stay on bookings that already have them) and
  has a price for that length on that date (`VALIDATION_ERROR`)

Deleting a therapist or room is refused (`THERAPIST_HAS_BOOKINGS` / `ROOM_HAS_BOOKINGS`, with
`details.upcoming`) while they have bookings that haven't ended; past bookings are kept.

Weekdays, leave dates and opening hours are evaluated in `SCHEDULE_TIMEZONE` (default
`Asia/Manila`), so they don't depend on the server's own time zone.

## Deploying with Docker (Droplet + shared Nginx proxy)

Files: `Dockerfile` (multi-stage: build with TypeScript, run `dist/` with production
dependencies only, non-root), `docker-compose.yaml` (the API plus a MongoDB container),
`nginx.conf` (server block for the shared proxy) and `.dockerignore`. Same layout as
kisetsu-scheduler-client.

1. **Once per Droplet**, the shared network the proxy and apps join:
   `docker network create web` (skip if it exists).
2. **Create `.env`** next to `docker-compose.yaml` (copy `.env.example`). It's read at runtime,
   never baked into the image. At least set a fresh secret:
    ```env
    JWT_SECRET=<node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
    AUTH_RATE_LIMIT_MAX=5
    SCHEDULE_TIMEZONE=Asia/Manila
    ```
    `docker-compose.yaml` always sets `NODE_ENV=production`, `PORT=2200`, `TRUST_PROXY=1`, and:
    - `MONGO_URI` → the bundled `mongo` container (data in the `mongo-data` volume).
      Set `DOCKER_MONGO_URI` in `.env` to use another database (e.g. Atlas).
    - `CORS_ORIGINS` → `https://scheduling.masings.com`. Set `DOCKER_CORS_ORIGINS` to change it.
3. **Build and start:** `docker compose up -d --build`. The API waits for MongoDB to be
   healthy, then creates the system roles on startup. Check with `docker compose ps` and
   `docker compose logs -f app`.
4. **Seed (optional, first deploy only):** the seed refuses to run in production, so run it
   explicitly in development mode inside the container:
   `docker compose exec -e NODE_ENV=development app node dist/scripts/seed.js`.
   It creates the sample accounts with **known passwords**: change them (or remove the
   accounts) right after, since the API is public.
5. **Proxy:** copy `nginx.conf` into the proxy's `conf.d/` as `scheduling-api.conf` (serves
   `scheduling-api.masings.com` over HTTPS with the shared `masings-apps` certificate), then
   `docker exec <nginx-proxy> nginx -t && docker exec <nginx-proxy> nginx -s reload`.
   Add a DNS A record for `scheduling-api.masings.com` and make sure the certificate includes it.
6. **Client:** build kisetsu-scheduler-client with
   `NEXT_PUBLIC_GRAPHQL_URL=https://scheduling-api.masings.com/graphql`.

The proxy reaches the API by its network alias `kisetsu-scheduler-server:2200`. MongoDB is only
on the project's private network, so it isn't reachable from the proxy or the internet. Apollo
Sandbox and introspection are off in production.

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

Codes: `VALIDATION_ERROR` (Zod issues in `extensions.details`), `UNAUTHENTICATED`, `FORBIDDEN`,
`INVALID_CREDENTIALS`, `WRONG_PASSWORD`, `IMPERSONATION_NOT_ALLOWED`, `CANNOT_IMPERSONATE_ADMIN`,
`CANNOT_MODIFY_SELF`, `ROLE_KEY_TAKEN`, `ROLE_IN_USE`, `SYSTEM_ROLE_LOCKED`, `NOT_FOUND`, `EMAIL_TAKEN`,
`THERAPIST_UNAVAILABLE`, `THERAPIST_DOUBLE_BOOKED`, `ROOM_TAKEN`, `THERAPIST_HAS_BOOKINGS`, `ROOM_HAS_BOOKINGS`, `SERVICE_NAME_TAKEN`, `SERVICE_IN_USE`,
`CLIENT_MOBILE_TAKEN`, `PROMO_NOT_APPLICABLE`, `PROMO_CODE_TAKEN`, `PROMO_LOCKED`, `PROMO_IN_USE`,
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
- `register`, `login` and `changePassword` share a stricter limiter (`AUTH_RATE_LIMIT_MAX` failed
  attempts per 15 min), applied with `@UseMiddleware(RateLimit(authLimiter))`.
- Apollo's CSRF prevention is on: browsers must send `Content-Type: application/json` or the
  `apollo-require-preflight` header.
- The `User` type has no password field, so the hash can't be selected by any query.
- `users` requires `readUsers`; example mutations require their user permissions.
- No shared or master passwords exist. Admin access to user accounts goes through audited,
  short-lived impersonation tokens.

## Scripts

| Script                        | What it does                                      |
| ----------------------------- | ------------------------------------------------- |
| `dev`                         | Watch mode with `.env`                            |
| `build` / `start`             | Compile to `dist/` / run the compiled server      |
| `test` / `test:run`           | Vitest (needs MongoDB; copy `.env.test.example`)  |
| `typecheck`, `lint`, `format` | The usual                                         |
| `seed` / `seed:reset`         | Seed demo users (refuses in production)           |
| `migrate:access`              | One-off: old role shapes to `role` + `extraPerms` |
| `schema:print`                | Print the GraphQL SDL                             |
