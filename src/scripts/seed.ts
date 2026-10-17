// The modules' root files load type-graphql decorators, which need reflect-metadata first
import 'reflect-metadata';
import mongoose from 'mongoose';
import { env } from '../core/config/env.js';
import { logger } from '../core/logger.js';
import { RoleKey, UsersImpl } from '../mods/users/index.js';
import { AuthImpl } from '../mods/auth/index.js';
import { connectDB, disconnectDB } from '../core/loaders/connectToMongo.js';
import { ConflictError } from '../shared/errors/AppError.js';

interface SeedUser {
    name: string;
    email: string;
    password: string;
    roles: RoleKey[];
}

const seedUsers: SeedUser[] = [
    {
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'Admin123!',
        roles: [RoleKey.appAdmin, RoleKey.user],
    },
    {
        name: 'Regular User',
        email: 'user@example.com',
        password: 'User123!',
        roles: [RoleKey.user],
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

async function seedUser(u: SeedUser): Promise<'created' | 'skipped'> {
    // Idempotent: never create the same email twice
    const existing = await UsersImpl.findByEmail(u.email);
    if (existing) return 'skipped';

    // Same path as a real sign-up, so hashing, defaults and rules all apply
    try {
        const user = await AuthImpl.register(u.name, u.email, u.password);
        // register() gives every new user the default role; apply extra roles here
        await UsersImpl.setRoles(user.id, u.roles);
        return 'created';
    } catch (error) {
        if (error instanceof ConflictError) return 'skipped';
        throw error;
    }
}

async function main() {
    await connectDB();

    if (shouldReset) await resetDatabase();

    let created = 0;
    let skipped = 0;

    for (const u of seedUsers) {
        const outcome = await seedUser(u);
        if (outcome === 'created') {
            created++;
            logger.info(`Seeded ${u.email}`, { roles: u.roles });
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
