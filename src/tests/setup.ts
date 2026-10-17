// Runs before every test file (see setupFiles in vitest.config.ts).
import 'reflect-metadata';
import mongoose from 'mongoose';
import { beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { connectDB, disconnectDB } from '../core/loaders/connectToMongo.js';
import { RolesImpl } from '../mods/roles/index.js';

beforeAll(async () => {
    // Safety guard: tests delete data, so never run them against a real database
    await connectDB();
    const dbName = mongoose.connection.name;
    if (!dbName.includes('test')) {
        await disconnectDB();
        throw new Error(`Refusing to run tests: database "${dbName}" must contain "test"`);
    }
    // Make sure unique indexes (e.g. User.email) exist before tests rely on them
    await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
});

beforeEach(async () => {
    // Same as server start: the system roles (super-admin, user) always exist
    await RolesImpl.ensureSystemRoles();
});

afterEach(async () => {
    // Start every test from an empty database
    const db = mongoose.connection.db;
    if (!db) return;
    const collections = await db.collections();
    await Promise.all(collections.map((c) => c.deleteMany({})));
});

afterAll(async () => {
    await disconnectDB();
});
