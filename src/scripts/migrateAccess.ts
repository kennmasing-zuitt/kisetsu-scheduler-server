// One-off migration to the Role-collection model. Safe to run more than once.
//   npm run migrate:access
//
// Handles both older shapes:
//   a) original:   roles: [{ key: 'appAdmin' | 'user' }]
//   b) perms era:  roles: [{ key: 'admin' | 'user' }], perms: [...]
// and converts each user to   role: '<role key>', extraPerms: [...]
//
//  - appAdmin, or admin holding superAdmin           -> role 'super-admin'
//  - admin with a limited permission set             -> a generated admin role per distinct set
//                                                       ('migrated-admin-1', ...), so nobody gains
//                                                       or loses access
//  - everyone else                                   -> role 'user'; any perms beyond the user
//                                                       role's become extraPerms
//  - changed users get tokenVersion + 1, so tokens with the old shape are revoked
//  - the old `roles` / `perms` fields are removed
import 'reflect-metadata';
import mongoose from 'mongoose';
import { env } from '../core/config/env.js';
import { logger } from '../core/logger.js';
import { connectDB, disconnectDB } from '../core/loaders/connectToMongo.js';
import {
    ADMIN_PERMISSIONS,
    DEFAULT_ROLE_KEY,
    Permission,
    RoleKind,
    RoleModel,
    RolesImpl,
    SUPER_ADMIN_ROLE_KEY,
    SYSTEM_ROLES,
} from '../mods/roles/index.js';

interface LegacyUser {
    _id: unknown;
    role?: string;
    roles?: { key: string }[];
    perms?: string[];
}

const userRolePerms = SYSTEM_ROLES.find((r) => r.key === DEFAULT_ROLE_KEY)!.perms as string[];

async function roleForAdminPerms(perms: string[], cache: Map<string, string>): Promise<string> {
    const adminPerms = perms.filter((p) => ADMIN_PERMISSIONS.includes(p as Permission)).sort();
    const signature = adminPerms.join(',');
    const cached = cache.get(signature);
    if (cached) return cached;

    const existing = await RoleModel.find({ key: /^migrated-admin-\d+$/ }).lean();
    const match = existing.find((r) => [...r.perms].sort().join(',') === signature);
    if (match) {
        cache.set(signature, match.key);
        return match.key;
    }
    const key = `migrated-admin-${existing.length + 1}`;
    await RoleModel.create({
        key,
        name: `Migrated admin ${existing.length + 1}`,
        description: 'Created by migrate:access from an admin with a custom permission set.',
        kind: RoleKind.admin,
        perms: adminPerms as Permission[],
    });
    cache.set(signature, key);
    return key;
}

async function main() {
    await connectDB();
    await RolesImpl.ensureSystemRoles();
    // The raw collection is used because the model no longer has `roles` / `perms`
    const users = mongoose.connection.collection<LegacyUser>('User');
    const generated = new Map<string, string>();
    const counts: Record<string, number> = {};

    for await (const user of users.find(
        { $or: [{ roles: { $exists: true } }, { perms: { $exists: true } }] },
        { projection: { role: 1, roles: 1, perms: 1 } },
    )) {
        const keys = (user.roles ?? []).map((r) => r.key);
        const perms = user.perms ?? [];
        const wasAdmin = keys.includes('appAdmin') || keys.includes('admin');

        let role: string;
        let extraPerms: string[] = [];
        if (keys.includes('appAdmin') || (wasAdmin && perms.includes(Permission.superAdmin))) {
            role = SUPER_ADMIN_ROLE_KEY;
        } else if (wasAdmin) {
            role = await roleForAdminPerms(perms, generated);
            extraPerms = perms.filter((p) => !ADMIN_PERMISSIONS.includes(p as Permission));
        } else {
            role = DEFAULT_ROLE_KEY;
            extraPerms = perms.filter((p) => !userRolePerms.includes(p));
        }

        await users.updateOne(
            { _id: user._id },
            {
                $set: { role, extraPerms },
                $unset: { roles: '', perms: '' },
                $inc: { tokenVersion: 1 },
            },
        );
        counts[role] = (counts[role] ?? 0) + 1;
    }

    logger.info('Access migration complete', {
        db: mongoose.connection.name,
        usersMigratedPerRole: counts,
        generatedRoles: [...generated.values()],
    });
}

if (env.isTest) {
    logger.error('Refusing to migrate the test database');
    process.exit(1);
}

try {
    await main();
} catch (err) {
    logger.error('Migration failed', {
        error: (err as Error).message,
        stack: (err as Error).stack,
    });
    process.exitCode = 1;
} finally {
    await disconnectDB();
}
