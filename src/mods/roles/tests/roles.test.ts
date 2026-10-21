import { describe, it, expect } from 'vitest';
import { bearer, gql } from '../../../tests/graphql.helpers.js';
import { AuditAction, AuditLogModel } from '../../audit/index.js';
import { createAdmin, createRoleDoc, registerTestUser } from '../../auth/tests/auth.helpers.js';
import { UsersOperations } from '../../users/index.js';
import { Permission, RoleKind, RoleModel } from '../index.js';

const ROLE_FIELDS = 'key name description kind perms isSystem';
const ROLES = `{ roles { ${ROLE_FIELDS} } }`;
const CREATE = `mutation ($input: CreateRoleInput!) { createRole(input: $input) { ${ROLE_FIELDS} } }`;
const UPDATE = `mutation ($key: String!, $input: UpdateRoleInput!) {
    updateRole(key: $key, input: $input) { ${ROLE_FIELDS} }
}`;
const DELETE = `mutation ($key: String!) { deleteRole(key: $key) }`;

interface RoleT {
    key: string;
    name: string;
    kind: string;
    perms: string[];
    isSystem: boolean;
}

const supportInput = {
    key: 'support',
    name: 'Support',
    description: 'Helps users',
    kind: 'admin',
    perms: ['readUsers', 'impersonateUsers'],
};

describe('query roles', () => {
    it('lists the system roles first; requires readRoles', async () => {
        const superAdmin = await createAdmin();
        const res = await gql<{ roles: RoleT[] }>(ROLES, undefined, bearer(superAdmin.token));
        expect(res.body.data?.roles.map((r: RoleT) => r.key)).toEqual(['super-admin', 'user']);
        expect(res.body.data?.roles[0]).toMatchObject({ kind: 'admin', isSystem: true });

        const user = await registerTestUser();
        const forbidden = await gql(ROLES, undefined, bearer(user.token));
        expect(forbidden.body.errors?.[0].extensions?.code).toBe('FORBIDDEN');
    });

    it('role(key) returns one role or null', async () => {
        const superAdmin = await createAdmin();
        const found = await gql<{ role: RoleT | null }>(
            '{ role(key: "user") { key perms } }',
            undefined,
            bearer(superAdmin.token),
        );
        expect(found.body.data?.role?.perms).toEqual([
            'createExample',
            'updateExample',
            'updateTherapist',
            'createBooking',
            'updateBooking',
            'deleteBooking',
            'readClients',
            'updateClient',
            'readSmsLogs',
        ]);
        const missing = await gql<{ role: RoleT | null }>(
            '{ role(key: "nope") { key } }',
            undefined,
            bearer(superAdmin.token),
        );
        expect(missing.body.data?.role).toBeNull();
    });
});

describe('mutation createRole', () => {
    it('super admin creates an admin role; it is audited', async () => {
        const superAdmin = await createAdmin();
        const res = await gql<{ createRole: RoleT }>(
            CREATE,
            { input: supportInput },
            bearer(superAdmin.token),
        );
        expect(res.body.errors).toBeUndefined();
        expect(res.body.data?.createRole).toMatchObject({
            key: 'support',
            kind: 'admin',
            perms: ['readUsers', 'impersonateUsers'],
            isSystem: false,
        });
        expect(await AuditLogModel.countDocuments({ action: AuditAction.roleCreated })).toBe(1);
    });

    it('rejects duplicate keys, bad keys and admin perms on user roles', async () => {
        const superAdmin = await createAdmin();
        await gql(CREATE, { input: supportInput }, bearer(superAdmin.token));

        const dup = await gql(CREATE, { input: supportInput }, bearer(superAdmin.token));
        expect(dup.body.errors?.[0].extensions).toMatchObject({
            code: 'ROLE_KEY_TAKEN',
            status: 409,
        });

        const badKey = await gql(
            CREATE,
            { input: { ...supportInput, key: 'Bad Key!' } },
            bearer(superAdmin.token),
        );
        expect(badKey.body.errors?.[0].extensions?.code).toBe('VALIDATION_ERROR');

        const adminPermOnUser = await gql(
            CREATE,
            { input: { key: 'odd', name: 'Odd', kind: 'user', perms: ['readUsers'] } },
            bearer(superAdmin.token),
        );
        expect(adminPermOnUser.body.errors?.[0].extensions?.code).toBe('VALIDATION_ERROR');
    });

    it('a role manager can create user roles with perms they hold, but not admin roles', async () => {
        const manager = await createAdmin([Permission.manageRoles, Permission.createExample]);

        const ok = await gql(
            CREATE,
            {
                input: {
                    key: 'creators',
                    name: 'Creators',
                    kind: 'user',
                    perms: ['createExample'],
                },
            },
            bearer(manager.token),
        );
        expect(ok.body.errors).toBeUndefined();

        const tooMuch = await gql(
            CREATE,
            {
                input: {
                    key: 'deleters',
                    name: 'Deleters',
                    kind: 'user',
                    perms: ['deleteExample'],
                },
            },
            bearer(manager.token),
        );
        expect(tooMuch.body.errors?.[0].message).toBe(
            "You cannot grant permissions you don't have: deleteExample",
        );

        const adminRole = await gql(CREATE, { input: supportInput }, bearer(manager.token));
        expect(adminRole.body.errors?.[0].message).toBe(
            'Only a super admin can manage admin roles',
        );
    });

    it('requires manageRoles', async () => {
        const support = await createAdmin([Permission.readRoles]);
        const res = await gql(CREATE, { input: supportInput }, bearer(support.token));
        expect(res.body.errors?.[0].extensions?.code).toBe('FORBIDDEN');
    });
});

describe('mutation updateRole', () => {
    it('changes perms for every user with the role on their next request', async () => {
        const superAdmin = await createAdmin();
        await createRoleDoc('editors', RoleKind.user, [Permission.createExample]);
        const user = await registerTestUser();
        await UsersOperations.setAccess(user.user.id, 'editors', []);

        const del = 'mutation { deleteExample(id: "000000000000000000000000") }';
        expect(
            (await gql(del, undefined, bearer(user.token))).body.errors?.[0].extensions?.code,
        ).toBe('FORBIDDEN');

        const res = await gql<{ updateRole: RoleT }>(
            UPDATE,
            { key: 'editors', input: { perms: ['createExample', 'deleteExample'] } },
            bearer(superAdmin.token),
        );
        expect(res.body.data?.updateRole.perms).toEqual(['createExample', 'deleteExample']);

        // Now passes the permission check (NOT_FOUND because the example doesn't exist)
        expect(
            (await gql(del, undefined, bearer(user.token))).body.errors?.[0].extensions?.code,
        ).toBe('NOT_FOUND');
        const log = await AuditLogModel.findOne({ action: AuditAction.roleUpdated }).lean();
        expect(log).toMatchObject({
            details: {
                before: { perms: ['createExample'] },
                after: { perms: ['createExample', 'deleteExample'] },
            },
        });
    });

    it('the super-admin role is locked', async () => {
        const superAdmin = await createAdmin();
        const res = await gql(
            UPDATE,
            { key: 'super-admin', input: { perms: [] } },
            bearer(superAdmin.token),
        );
        expect(res.body.errors?.[0].extensions?.code).toBe('SYSTEM_ROLE_LOCKED');
    });

    it("a role manager can't edit a role holding perms they lack", async () => {
        const manager = await createAdmin([Permission.manageRoles, Permission.createExample]);
        await createRoleDoc('deleters', RoleKind.user, [Permission.deleteExample]);
        const res = await gql(
            UPDATE,
            { key: 'deleters', input: { name: 'Renamed' } },
            bearer(manager.token),
        );
        expect(res.body.errors?.[0].extensions?.code).toBe('FORBIDDEN');
    });
});

describe('mutation deleteRole', () => {
    it('deletes an unused custom role', async () => {
        const superAdmin = await createAdmin();
        await createRoleDoc('temp', RoleKind.user, []);
        const res = await gql<{ deleteRole: boolean }>(
            DELETE,
            { key: 'temp' },
            bearer(superAdmin.token),
        );
        expect(res.body.data?.deleteRole).toBe(true);
        expect(await RoleModel.countDocuments({ key: 'temp' })).toBe(0);
        expect(await AuditLogModel.countDocuments({ action: AuditAction.roleDeleted })).toBe(1);
    });

    it('refuses system roles and roles still assigned to users', async () => {
        const superAdmin = await createAdmin();
        const system = await gql(DELETE, { key: 'user' }, bearer(superAdmin.token));
        expect(system.body.errors?.[0].extensions?.code).toBe('SYSTEM_ROLE_LOCKED');

        await createRoleDoc('editors', RoleKind.user, []);
        const user = await registerTestUser();
        await UsersOperations.setAccess(user.user.id, 'editors', []);
        const inUse = await gql(DELETE, { key: 'editors' }, bearer(superAdmin.token));
        expect(inUse.body.errors?.[0].extensions).toMatchObject({
            code: 'ROLE_IN_USE',
            status: 409,
            details: { assigned: 1 },
        });
    });
});
