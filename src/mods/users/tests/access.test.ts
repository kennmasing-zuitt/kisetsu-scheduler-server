import { describe, it, expect } from 'vitest';
import { bearer, gql } from '../../../tests/graphql.helpers.js';
import { AuditAction, AuditLogModel } from '../../audit/index.js';
import { createAdmin, createRoleDoc, registerTestUser } from '../../auth/tests/auth.helpers.js';
import { Permission, RoleKind } from '../../roles/index.js';
import { UserModel } from '../index.js';

// The default `user` role: the example permissions plus the schedule ones
const DEFAULT_USER_PERMS = [
    'createExample',
    'updateExample',
    'updateTherapist',
    'createBooking',
    'updateBooking',
    'deleteBooking',
    'readClients',
    'updateClient',
    'readSmsLogs',
];

const SET_ACCESS = /* GraphQL */ `
    mutation SetUserAccess($userId: ID!, $input: SetUserAccessInput!) {
        setUserAccess(userId: $userId, input: $input) {
            id
            role {
                key
                kind
            }
            extraPerms
        }
    }
`;
const SESSION = '{ session { user { id } effectivePerms impersonatedBy { id } } }';

type AccessData = {
    setUserAccess: { id: string; role: { key: string; kind: string }; extraPerms: string[] };
};

const setAccess = (token: string, userId: string, role: string, extraPerms: string[] = []) =>
    gql<AccessData>(SET_ACCESS, { userId, input: { role, extraPerms } }, bearer(token));

const effectivePerms = async (token: string) =>
    (await gql<{ session: { effectivePerms: string[] } }>(SESSION, undefined, bearer(token))).body
        .data?.session.effectivePerms;

describe('effective permissions', () => {
    it('are the role perms plus extraPerms; a super admin has all of them', async () => {
        const user = await registerTestUser();
        expect(await effectivePerms(user.token)).toEqual(DEFAULT_USER_PERMS);

        await UserModel.updateOne(
            { _id: user.user.id },
            { $set: { extraPerms: ['deleteExample'] } },
        );
        // Effective permissions come back in enum order
        expect(await effectivePerms(user.token)).toEqual([
            'createExample',
            'updateExample',
            'deleteExample',
            'updateTherapist',
            'createBooking',
            'updateBooking',
            'deleteBooking',
            'readClients',
            'updateClient',
            'readSmsLogs',
        ]);

        const superAdmin = await createAdmin();
        const all = await effectivePerms(superAdmin.token);
        expect(all).toContain('impersonateUsers');
        expect(all).toContain('deleteExample');
    });

    it('drop admin permissions unless the role is admin-kind', async () => {
        const user = await registerTestUser();
        await UserModel.updateOne(
            { _id: user.user.id },
            { $set: { extraPerms: ['readUsers', 'superAdmin'] } },
        );
        expect(await effectivePerms(user.token)).toEqual(DEFAULT_USER_PERMS);
    });
});

describe('mutation setUserAccess', () => {
    it('super admin can assign an admin role, which applies immediately and is audited', async () => {
        const superAdmin = await createAdmin();
        await createRoleDoc('readers', RoleKind.admin, [Permission.readUsers]);
        const target = await registerTestUser();

        const res = await setAccess(superAdmin.token, target.user.id, 'readers');
        expect(res.body.errors).toBeUndefined();
        expect(res.body.data?.setUserAccess).toMatchObject({
            role: { key: 'readers', kind: 'admin' },
            extraPerms: [],
        });

        // The target's existing token has readUsers now, without re-login
        const users = await gql('{ users { total } }', undefined, bearer(target.token));
        expect(users.body.errors).toBeUndefined();

        const log = await AuditLogModel.findOne({ action: AuditAction.userAccessChanged }).lean();
        expect(log).toMatchObject({
            details: { before: { role: 'user' }, after: { role: 'readers', extraPerms: [] } },
        });
    });

    it('can grant per-user extra permissions', async () => {
        const superAdmin = await createAdmin();
        const target = await registerTestUser();
        await setAccess(superAdmin.token, target.user.id, 'user', ['deleteExample']);
        expect((await UserModel.findById(target.user.id))!.extraPerms).toEqual(['deleteExample']);
    });

    it('rejects admin extras on a user-kind role, and unknown roles', async () => {
        const superAdmin = await createAdmin();
        const target = await registerTestUser();
        const adminExtra = await setAccess(superAdmin.token, target.user.id, 'user', ['readUsers']);
        expect(adminExtra.body.errors?.[0].extensions?.code).toBe('VALIDATION_ERROR');

        const unknown = await setAccess(superAdmin.token, target.user.id, 'nope');
        expect(unknown.body.errors?.[0].extensions?.code).toBe('NOT_FOUND');
    });

    it('nobody can change their own access', async () => {
        const superAdmin = await createAdmin();
        const res = await setAccess(superAdmin.token, superAdmin.user.id, 'user');
        expect(res.body.errors?.[0].extensions?.code).toBe('CANNOT_MODIFY_SELF');
    });

    it('a limited admin can only hand out permissions they hold (via role or extras)', async () => {
        const manager = await createAdmin([Permission.manageUserAccess, Permission.createExample]);
        await createRoleDoc('creators', RoleKind.user, [Permission.createExample]);
        await createRoleDoc('deleters', RoleKind.user, [Permission.deleteExample]);
        const target = await registerTestUser();

        const ok = await setAccess(manager.token, target.user.id, 'creators', ['createExample']);
        expect(ok.body.errors).toBeUndefined();

        const viaRole = await setAccess(manager.token, target.user.id, 'deleters');
        expect(viaRole.body.errors?.[0].message).toBe(
            "You cannot grant permissions you don't have: deleteExample",
        );
        const viaExtra = await setAccess(manager.token, target.user.id, 'creators', [
            'deleteExample',
        ]);
        expect(viaExtra.body.errors?.[0].extensions?.code).toBe('FORBIDDEN');
    });

    it('only a super admin can give admin roles or change admins', async () => {
        const manager = await createAdmin([Permission.manageUserAccess, Permission.readUsers]);
        await createRoleDoc('readers', RoleKind.admin, [Permission.readUsers]);
        const target = await registerTestUser();
        const otherAdmin = await createAdmin([Permission.readUsers], {
            email: 'other.admin@example.com',
        });

        const promote = await setAccess(manager.token, target.user.id, 'readers');
        expect(promote.body.errors?.[0].message).toBe('Only a super admin can manage admins');

        const demote = await setAccess(manager.token, otherAdmin.user.id, 'user');
        expect(demote.body.errors?.[0].message).toBe('Only a super admin can manage admins');
    });

    it('requires manageUserAccess', async () => {
        const support = await createAdmin([Permission.readUsers]);
        const target = await registerTestUser();
        const res = await setAccess(support.token, target.user.id, 'user');
        expect(res.body.errors?.[0].extensions?.code).toBe('FORBIDDEN');
    });
});
