import { describe, it, expect } from 'vitest';
import { bearer, gql } from '../../../tests/graphql.helpers.js';
import { Permission } from '../../roles/index.js';
import { UserModel } from '../../users/index.js';
import { createAdmin, ME_QUERY, registerTestUser } from './auth.helpers.js';

const LOGOUT_USER = /* GraphQL */ `
    mutation LogoutUser($userId: ID!) {
        logoutUser(userId: $userId)
    }
`;

const me = (token: string) => gql<{ me: { id: string } }>(ME_QUERY, undefined, bearer(token));

describe('mutation logoutUser (admin)', () => {
    it('signs the target user out of every device', async () => {
        const admin = await createAdmin();
        const target = await registerTestUser({ email: 'target@example.com' });
        const bystander = await registerTestUser({ email: 'bystander@example.com' });

        const res = await gql<{ logoutUser: boolean }>(
            LOGOUT_USER,
            { userId: target.user.id },
            bearer(admin.token),
        );
        expect(res.body.errors).toBeUndefined();
        expect(res.body.data?.logoutUser).toBe(true);

        expect((await UserModel.findById(target.user.id))!.tokenVersion).toBe(1);
        expect((await me(target.token)).status).toBe(401);
        // Nobody else is affected
        expect((await me(bystander.token)).status).toBe(200);
        expect((await me(admin.token)).status).toBe(200);
    });

    it('returns NOT_FOUND for an unknown user and VALIDATION_ERROR for a malformed id', async () => {
        const admin = await createAdmin();
        const missing = await gql(
            LOGOUT_USER,
            { userId: '000000000000000000000000' },
            bearer(admin.token),
        );
        expect(missing.body.errors?.[0].extensions).toMatchObject({
            code: 'NOT_FOUND',
            status: 404,
        });

        const malformed = await gql(LOGOUT_USER, { userId: 'nope' }, bearer(admin.token));
        expect(malformed.body.errors?.[0].extensions?.code).toBe('VALIDATION_ERROR');
    });

    it('works for a limited admin holding only logoutUsers', async () => {
        const support = await createAdmin([Permission.logoutUsers]);
        const target = await registerTestUser({ email: 'target@example.com' });
        const res = await gql(LOGOUT_USER, { userId: target.user.id }, bearer(support.token));
        expect(res.body.errors).toBeUndefined();
        expect((await me(target.token)).status).toBe(401);
    });

    it('is forbidden for an admin without logoutUsers', async () => {
        const readOnly = await createAdmin([Permission.readUsers]);
        const target = await registerTestUser({ email: 'target@example.com' });
        const res = await gql(LOGOUT_USER, { userId: target.user.id }, bearer(readOnly.token));
        expect(res.body.errors?.[0]).toMatchObject({
            message: 'Missing permission: logoutUsers',
            extensions: { code: 'FORBIDDEN', status: 403 },
        });
    });

    it('is forbidden for non-admins and requires a token', async () => {
        const user = await registerTestUser();
        const other = await registerTestUser({ email: 'other@example.com' });

        const forbidden = await gql(LOGOUT_USER, { userId: other.user.id }, bearer(user.token));
        expect(forbidden.body.errors?.[0].extensions).toMatchObject({
            code: 'FORBIDDEN',
            status: 403,
        });
        expect((await me(other.token)).status).toBe(200);

        const anonymous = await gql(LOGOUT_USER, { userId: other.user.id });
        expect(anonymous.body.errors?.[0].extensions?.code).toBe('UNAUTHENTICATED');
    });
});
