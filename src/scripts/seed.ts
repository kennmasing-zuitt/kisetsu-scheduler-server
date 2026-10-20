// The modules' root files load type-graphql decorators, which need reflect-metadata first
import 'reflect-metadata';
import mongoose from 'mongoose';
import { env } from '../core/config/env.js';
import { logger } from '../core/logger.js';
import {
    DEFAULT_ROLE_KEY,
    DEFAULT_SCHEDULE_PERMISSIONS,
    PERMISSION_VALUES,
    Permission,
    RoleKind,
    RoleModel,
    RolesImpl,
    SUPER_ADMIN_ROLE_KEY,
} from '../mods/roles/index.js';
import { UsersImpl, UsersOperations } from '../mods/users/index.js';
import { AuthImpl } from '../mods/auth/index.js';
import { RoomModel, ServiceModel, TherapistModel } from '../mods/schedule/index.js';
import { connectDB, disconnectDB } from '../core/loaders/connectToMongo.js';
import { ConflictError } from '../shared/errors/AppError.js';

// Custom roles (the system roles super-admin and user are created by ensureSystemRoles)
const seedRoles = [
    {
        key: 'support',
        name: 'Support',
        description: 'Looks users up, signs them out and impersonates them to help with tickets.',
        kind: RoleKind.admin,
        perms: [
            Permission.readUsers,
            Permission.logoutUsers,
            Permission.impersonateUsers,
            Permission.readAuditLogs,
        ],
    },
];

interface SeedUser {
    name: string;
    email: string;
    password: string;
    role: string;
    extraPerms?: Permission[];
}

const seedUsers: SeedUser[] = [
    {
        name: 'Super Admin',
        email: 'admin@example.com',
        password: 'Admin123!',
        role: SUPER_ADMIN_ROLE_KEY,
    },
    {
        name: 'Support Admin',
        email: 'support@example.com',
        password: 'Support123!',
        role: 'support',
    },
    {
        name: 'Regular User',
        email: 'user@example.com',
        password: 'User123!',
        role: DEFAULT_ROLE_KEY,
    },
];

// Schedule: the roster (offDays: 0 = Sunday … 6 = Saturday) and the rooms
const seedTherapists = [
    { name: 'Ana', offDays: [0] }, // off Sun
    { name: 'Ben', offDays: [2, 3] }, // off Tue, Wed
    { name: 'Carla', offDays: [1] }, // off Mon
    { name: 'Dana', offDays: [0, 6] }, // off Sat, Sun
];

const seedRooms = [
    { name: 'Room 1', color: '#534AB7' },
    { name: 'Room 2', color: '#0F6E56' },
    { name: 'Room 3', color: '#993C1D' },
    { name: 'Room 4', color: '#993556' },
];

// Services and their prices. Each price is valid from PRICES_FROM with no end date; when a
// price changes, end the old rule the day before and add a new one (Therapists & rooms page).
const PRICES_FROM = '2025-01-01';
const MON_TO_THU = [1, 2, 3, 4];
const FRI_TO_SUN = [0, 5, 6];
const seedServices = [
    {
        name: 'Fuyu',
        prices: [
            { durationMin: 60, amount: 1099 },
            { durationMin: 80, amount: 1199 },
        ],
    },
    {
        name: 'Natsu',
        prices: [
            { durationMin: 60, amount: 1299 },
            { durationMin: 80, amount: 1399 },
        ],
    },
    { name: 'Haru', prices: [{ durationMin: 80, amount: 1599 }] },
    { name: 'Shiki', prices: [{ durationMin: 120, amount: 2499 }] },
    {
        // Any length; priced by weekday
        name: 'Aki',
        prices: [
            { days: MON_TO_THU, amount: 699 },
            { days: FRI_TO_SUN, amount: 799 },
        ],
    },
];

// ---------- Guards ----------
const shouldReset = process.argv.includes('--reset');

if (env.isProduction) {
    logger.error('Refusing to seed: NODE_ENV is production');
    process.exit(1);
}

// ---------- Steps ----------
async function resetDatabase() {
    const dbName = mongoose.connection.name;
    logger.warn(`--reset: dropping database "${dbName}"`);
    await mongoose.connection.dropDatabase();
}

async function seedRolesStep() {
    await RolesImpl.ensureSystemRoles();
    for (const role of seedRoles) {
        if (await RoleModel.exists({ key: role.key })) {
            logger.info(`Skipped role ${role.key} (already exists)`);
            continue;
        }
        await RoleModel.create({ ...role, isSystem: false });
        logger.info(`Seeded role ${role.key}`);
    }
    // ensureSystemRoles never overwrites an existing role, so a database seeded before the
    // schedule modules existed gets the schedule permissions added to the default role here
    const { modifiedCount } = await RoleModel.updateOne(
        { key: DEFAULT_ROLE_KEY },
        { $addToSet: { perms: { $each: DEFAULT_SCHEDULE_PERMISSIONS } } },
    );
    if (modifiedCount) logger.info(`Added schedule permissions to role ${DEFAULT_ROLE_KEY}`);

    // `superAdmin` already implies every permission; the full list is stored on the role too so
    // it reads explicitly in the DB and in `roles`. Written directly because the role is locked
    // against the API, and re-run on every seed so permissions added later are picked up.
    const superAdmin = await RoleModel.updateOne(
        { key: SUPER_ADMIN_ROLE_KEY },
        { $addToSet: { perms: { $each: PERMISSION_VALUES } } },
    );
    if (superAdmin.modifiedCount) {
        logger.info(`Granted every permission to role ${SUPER_ADMIN_ROLE_KEY}`);
    }
}

async function seedScheduleStep() {
    for (const t of seedTherapists) {
        if (await TherapistModel.exists({ name: t.name })) continue;
        await TherapistModel.create({ ...t, leaveDates: [] });
        logger.info(`Seeded therapist ${t.name}`);
    }
    for (const r of seedRooms) {
        if (await RoomModel.exists({ name: r.name })) continue;
        await RoomModel.create(r);
        logger.info(`Seeded room ${r.name}`);
    }
    for (const svc of seedServices) {
        // Names are unique ignoring case; never overwrite prices someone has edited
        const exists = await ServiceModel.exists({ name: svc.name }).collation({
            locale: 'en',
            strength: 2,
        });
        if (exists) continue;
        await ServiceModel.create({
            name: svc.name,
            prices: svc.prices.map((p) => ({
                durationMin: null,
                days: [],
                ...p,
                validFrom: PRICES_FROM,
                validTo: null,
            })),
        });
        logger.info(`Seeded service ${svc.name}`);
    }
}

async function seedUser(u: SeedUser): Promise<'created' | 'skipped'> {
    // Idempotent: never create the same email twice
    const existing = await UsersImpl.findByEmail(u.email);
    if (existing) return 'skipped';

    // Same path as a real sign-up, so hashing, defaults and rules all apply
    try {
        const { user } = await AuthImpl.register({
            name: u.name,
            email: u.email,
            password: u.password,
        });
        // register() assigns the default role; set the seeded one directly
        // (UsersImpl.updateUserAccess needs an acting admin, which doesn't exist yet)
        await UsersOperations.setAccess(user.id, u.role, u.extraPerms ?? []);
        return 'created';
    } catch (error) {
        if (error instanceof ConflictError) return 'skipped';
        throw error;
    }
}

async function main() {
    await connectDB();

    if (shouldReset) await resetDatabase();
    await seedRolesStep();
    await seedScheduleStep();

    let created = 0;
    let skipped = 0;

    for (const u of seedUsers) {
        const outcome = await seedUser(u);
        if (outcome === 'created') {
            created++;
            logger.info(`Seeded ${u.email}`, { role: u.role });
        } else {
            skipped++;
            logger.info(`Skipped ${u.email} (already exists)`);
        }
    }

    logger.info('Seeding complete', { created, skipped });
}

// ---------- Run ----------
try {
    await main();
} catch (err) {
    logger.error('Seeding failed', {
        error: (err as Error).message,
        stack: (err as Error).stack,
    });
    process.exitCode = 1;
} finally {
    // Always close the connection so the process can exit
    await disconnectDB();
}
