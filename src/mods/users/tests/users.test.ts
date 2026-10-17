import { describe, it, expect } from 'vitest';
import { gql } from '../../../tests/graphql.helpers.js';
import { registerTestUser } from '../../auth/tests/auth.helpers.js';

const USERS_QUERY = /* GraphQL */ `
    query Users($page: Int, $limit: Int) {
        users(page: $page, limit: $limit) {
            data {
                id
                name
                email
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
        for (let i = 1; i <= 3; i++) {
            await registerTestUser({ email: `user${i}@example.com`, name: `User ${i}` });
        }

        const res = await gql<UsersData>(USERS_QUERY, { page: 1, limit: 2 });

        expect(res.body.errors).toBeUndefined();
        const users = res.body.data!.users;
        expect(users).toMatchObject({ page: 1, limit: 2, total: 3, totalPages: 2 });
        expect(users.data).toHaveLength(2);
        expect(users.data[0].id).toMatch(/^[a-f0-9]{24}$/);
    });

    it('uses defaults when no arguments are given', async () => {
        const res = await gql<UsersData>(USERS_QUERY);
        expect(res.body.data!.users).toMatchObject({ page: 1, limit: 20, total: 0, data: [] });
    });

    it('rejects a limit above 100 with VALIDATION_ERROR', async () => {
        const res = await gql(USERS_QUERY, { limit: 500 });
        expect(res.body.errors?.[0].extensions?.code).toBe('VALIDATION_ERROR');
    });
});
