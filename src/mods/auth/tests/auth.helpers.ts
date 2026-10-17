import { AuthImpl } from '../index.js';

export const testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'Password123!',
};

// Seeds a user directly through the service (no HTTP)
export async function registerTestUser(overrides: Partial<typeof testUser> = {}) {
    const body = { ...testUser, ...overrides };
    const user = await AuthImpl.register(body.name, body.email, body.password);
    return { user, body };
}

export const REGISTER_MUTATION = /* GraphQL */ `
    mutation Register($input: RegisterInput!) {
        register(input: $input) {
            message
            user {
                id
                name
                email
                roles {
                    key
                }
                createdAt
            }
        }
    }
`;
