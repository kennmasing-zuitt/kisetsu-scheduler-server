import { describe, it, expect } from 'vitest';
import { bearer, gql } from '../../../tests/graphql.helpers.js';
import { createAdmin, registerTestUser } from '../../auth/tests/auth.helpers.js';
import { Permission } from '../../roles/index.js';

const USERS_QUERY = /* GraphQL */ `
    query Users($page: Int, $limit: Int) {
        users(page: $page, limit: $limit) {
            data {
                id
                name
                email
                role {
                    key
                    perms
                }
                extraPerms
            }
            page
            limit
            total
            totalPages
        }
    }
`;

interface UsersData {
    users: {
        data: { id: string; name: string; email: string }[];
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

describe('query users', () => {
    it('returns a paginated list', async () => {
        const admin = await createAdmin([Permission.readUsers]);
        for (let i = 1; i <= 2; i++) {
            await registerTestUser({ email: `user${i}@example.com`, name: `User ${i}` });
        }

        const res = await gql<UsersData>(USERS_QUERY, { page: 1, limit: 2 }, bearer(admin.token));

        expect(res.body.errors).toBeUndefined();
        const users = res.body.data!.users;
        expect(users).toMatchObject({ page: 1, limit: 2, total: 3, totalPages: 2 });
        expect(users.data).toHaveLength(2);
        expect(users.data[0].id).toMatch(/^[a-f0-9]{24}$/);
    });

    it('uses defaults when no arguments are given', async () => {
        const admin = await createAdmin();
        const res = await gql<UsersData>(USERS_QUERY, undefined, bearer(admin.token));
        expect(res.body.data!.users).toMatchObject({ page: 1, limit: 20, total: 1 });
    });

    it('exposes the role with its perms (new users get the default user role)', async () => {
        const admin = await createAdmin();
        await registerTestUser();
        type Row = { email: string; role: { key: string; perms: string[] }; extraPerms: string[] };
        const res = await gql<{ users: { data: Row[] } }>(
            USERS_QUERY,
            undefined,
            bearer(admin.token),
        );
        const user = res.body.data!.users.data.find((u: Row) => u.email === 'test@example.com');
        expect(user).toMatchObject({
            role: {
                key: 'user',
                perms: [
                    'createExample',
                    'updateExample',
                    'updateTherapist',
                    'createBooking',
                    'updateBooking',
                    'deleteBooking',
                    'readClients',
                    'updateClient',
                    'readSmsLogs',
                ],
            },
            extraPerms: [],
        });
    });

    it('requires readUsers', async () => {
        const user = await registerTestUser();
        const asUser = await gql(USERS_QUERY, undefined, bearer(user.token));
        expect(asUser.body.errors?.[0].extensions?.code).toBe('FORBIDDEN');

        const anonymous = await gql(USERS_QUERY);
        expect(anonymous.body.errors?.[0].extensions?.code).toBe('UNAUTHENTICATED');

        // A user can't gain readUsers from extraPerms: admin perms need an admin-kind role
        const { UserModel } = await import('../index.js');
        await UserModel.updateOne({ _id: user.user.id }, { $set: { extraPerms: ['readUsers'] } });
        const sneaky = await gql(USERS_QUERY, undefined, bearer(user.token));
        expect(sneaky.body.errors?.[0].extensions?.code).toBe('FORBIDDEN');
    });

    it('rejects a limit above 100 with VALIDATION_ERROR', async () => {
        const admin = await createAdmin();
        const res = await gql(USERS_QUERY, { limit: 500 }, bearer(admin.token));
        expect(res.body.errors?.[0].extensions?.code).toBe('VALIDATION_ERROR');
    });
});
