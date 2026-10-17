// The modules' root files load type-graphql decorators, which need reflect-metadata first
import 'reflect-metadata';
import mongoose from 'mongoose';
import { env } from '../core/config/env.js';
import { logger } from '../core/logger.js';
import {
    DEFAULT_ROLE_KEY,
    Permission,
    RoleKind,
    RoleModel,
    RolesImpl,
    SUPER_ADMIN_ROLE_KEY,
} from '../mods/roles/index.js';
import { UsersImpl, UsersOperations } from '../mods/users/index.js';
import { AuthImpl } from '../mods/auth/index.js';
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
