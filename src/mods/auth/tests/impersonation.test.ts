import jwt from 'jsonwebtoken';
import { describe, it, expect } from 'vitest';
import { bearer, gql } from '../../../tests/graphql.helpers.js';
import { AuditAction, AuditLogModel } from '../../audit/index.js';
import { Permission, RoleKind, SUPER_ADMIN_ROLE_KEY } from '../../roles/index.js';
import { UserModel, UsersOperations } from '../../users/index.js';
import {
    createAdmin,
    createRoleDoc,
    ME_QUERY,
    registerTestUser,
    testUser,
} from './auth.helpers.js';

const IMPERSONATE = /* GraphQL */ `
    mutation Impersonate($userId: ID!, $reason: String!) {
        impersonateUser(userId: $userId, reason: $reason) {
            token
            expiresAt
            impersonatedBy
            user {
                id
                email
            }
        }
    }
`;
const SESSION = '{ session { user { id } impersonatedBy { id email } } }';
const REASON = 'Ticket #123: user cannot see their dashboard';

interface ImpersonationData {
    impersonateUser: {
        token: string;
        expiresAt: string;
        impersonatedBy: string;
        user: { id: string; email: string };
    };
}

const me = (token: string) => gql<{ me: { id: string } }>(ME_QUERY, undefined, bearer(token));

async function startSession(adminToken: string, userId: string, reason = REASON) {
    return gql<ImpersonationData>(IMPERSONATE, { userId, reason }, bearer(adminToken));
}

describe('mutation impersonateUser', () => {
    it('returns a short-lived token that acts as the user, tied to the admin', async () => {
        const support = await createAdmin([Permission.impersonateUsers]);
        const target = await registerTestUser();

        const res = await startSession(support.token, target.user.id);
        expect(res.body.errors).toBeUndefined();
        const session = res.body.data!.impersonateUser;
        expect(session.user.email).toBe(testUser.email);
        expect(session.impersonatedBy).toBe(support.user.id);

        const claims = jwt.decode(session.token) as jwt.JwtPayload;
        expect(claims).toMatchObject({ sub: target.user.id, act: { sub: support.user.id } });
        expect(claims.exp! - claims.iat!).toBe(15 * 60);
        expect(new Date(session.expiresAt).getTime()).toBe(claims.exp! * 1000);

        // Acts as the user...
        expect((await me(session.token)).body.data?.me.id).toBe(target.user.id);
        // ...and the session says who is behind it
        const who = await gql<{ session: { impersonatedBy: { id: string } } }>(
            SESSION,
            undefined,
            bearer(session.token),
        );
        expect(who.body.data?.session.impersonatedBy.id).toBe(support.user.id);
    });

    it('records the start in the audit log with the reason', async () => {
        const support = await createAdmin([Permission.impersonateUsers, Permission.readAuditLogs]);
        const target = await registerTestUser();
        await startSession(support.token, target.user.id);

        const log = await AuditLogModel.findOne({
            action: AuditAction.impersonationStarted,
        }).lean();
        expect(log).toMatchObject({ reason: REASON });
        expect(String(log!.actorId)).toBe(support.user.id);
        expect(String(log!.targetId)).toBe(target.user.id);

        const res = await gql<{ auditLogs: { data: { action: string; reason: string }[] } }>(
            '{ auditLogs { data { action actorId targetId reason requestId createdAt } } }',
            undefined,
            bearer(support.token),
        );
        expect(res.body.data?.auditLogs.data[0]).toMatchObject({
            action: 'impersonationStarted',
            reason: REASON,
        });
    });

    it('blocks logout, changePassword and nested impersonation for impersonation tokens', async () => {
        const superAdmin = await createAdmin();
        const target = await registerTestUser();
        const other = await registerTestUser({ email: 'other@example.com' });
        const { token } = (await startSession(superAdmin.token, target.user.id)).body.data!
            .impersonateUser;

        const attempts = [
            gql('mutation { logout }', undefined, bearer(token)),
            gql(
                'mutation ($i: ChangePasswordInput!) { changePassword(input: $i) { token } }',
                { i: { currentPassword: testUser.password, newPassword: 'Another123!' } },
                bearer(token),
            ),
            startSession(token, other.user.id),
        ];
        for (const res of await Promise.all(attempts)) {
            expect(res.body.errors?.[0].extensions?.code).toMatch(
                /IMPERSONATION_NOT_ALLOWED|FORBIDDEN/,
            );
        }
        // The user's real session and password are untouched
        expect((await me(target.token)).status).toBe(200);
        expect((await UserModel.findById(target.user.id))!.tokenVersion).toBe(0);
    });

    it('cannot impersonate admins', async () => {
        const superAdmin = await createAdmin();
        const support = await createAdmin([Permission.readUsers]);
        const res = await startSession(superAdmin.token, support.user.id);
        expect(res.body.errors?.[0].extensions?.code).toBe('CANNOT_IMPERSONATE_ADMIN');
    });

    it('requires impersonateUsers, a valid user and a reason', async () => {
        const user = await registerTestUser();
        const other = await registerTestUser({ email: 'other@example.com' });
        const support = await createAdmin([Permission.readUsers]);
        const superAdmin = await createAdmin();

        expect(
            (await startSession(user.token, other.user.id)).body.errors?.[0].extensions?.code,
        ).toBe('FORBIDDEN');
        expect(
            (await startSession(support.token, other.user.id)).body.errors?.[0].extensions?.code,
        ).toBe('FORBIDDEN');
        expect(
            (await startSession(superAdmin.token, '000000000000000000000000')).body.errors?.[0]
                .extensions?.code,
        ).toBe('NOT_FOUND');
        expect(
            (await startSession(superAdmin.token, other.user.id, 'hi')).body.errors?.[0].extensions
                ?.code,
        ).toBe('VALIDATION_ERROR');
    });

    describe('the session ends early when', () => {
        it("the admin's role loses impersonateUsers", async () => {
            const support = await createAdmin([Permission.impersonateUsers]);
            const target = await registerTestUser();
            const { token } = (await startSession(support.token, target.user.id)).body.data!
                .impersonateUser;

            // Swap the admin onto a role without impersonateUsers
            await createRoleDoc('readers', RoleKind.admin, [Permission.readUsers]);
            await UsersOperations.setAccess(support.user.id, 'readers', []);
            const res = await me(token);
            expect(res.status).toBe(401);
            expect(res.body.errors?.[0].message).toBe('Impersonation session has ended');
        });

        it('the admin logs out', async () => {
            const support = await createAdmin([Permission.impersonateUsers]);
            const target = await registerTestUser();
            const { token } = (await startSession(support.token, target.user.id)).body.data!
                .impersonateUser;

            await gql('mutation { logout }', undefined, bearer(support.token));
            expect((await me(token)).status).toBe(401);
        });

        it("the user's tokens are revoked", async () => {
            const superAdmin = await createAdmin();
            const target = await registerTestUser();
            const { token } = (await startSession(superAdmin.token, target.user.id)).body.data!
                .impersonateUser;

            await gql(
                'mutation ($id: ID!) { logoutUser(userId: $id) }',
                { id: target.user.id },
                bearer(superAdmin.token),
            );
            expect((await me(token)).status).toBe(401);
        });

        it('the user is given an admin role', async () => {
            const superAdmin = await createAdmin();
            const target = await registerTestUser();
            const { token } = (await startSession(superAdmin.token, target.user.id)).body.data!
                .impersonateUser;

            await UsersOperations.setAccess(target.user.id, SUPER_ADMIN_ROLE_KEY, []);
            expect((await me(token)).status).toBe(401);
        });
    });
});
