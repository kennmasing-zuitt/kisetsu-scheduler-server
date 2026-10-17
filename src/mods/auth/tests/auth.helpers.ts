import { AuthImpl } from '../index.js';

export const testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'Password123!',
};

// Seeds a user directly through the service (no HTTP). Returns the user and a valid token.
export async function registerTestUser(overrides: Partial<typeof testUser> = {}) {
    const body = { ...testUser, ...overrides };
    const { user, token } = await AuthImpl.register(body);
    return { user, token, body };
}

export const REGISTER_MUTATION = /* GraphQL */ `
    mutation Register($input: RegisterInput!) {
        register(input: $input) {
            message
            token
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

export const LOGIN_MUTATION = /* GraphQL */ `
    mutation Login($input: LoginInput!) {
        login(input: $input) {
            token
            user {
                id
                email
            }
        }
    }
`;

export const ME_QUERY = /* GraphQL */ `
    query Me {
        me {
            id
            name
            email
            roles {
                key
            }
        }
    }
`;

export const LOGOUT_MUTATION = /* GraphQL */ `
    mutation Logout {
        logout
    }
`;

export const CHANGE_PASSWORD_MUTATION = /* GraphQL */ `
    mutation ChangePassword($input: ChangePasswordInput!) {
        changePassword(input: $input) {
            token
            user {
                id
            }
        }
    }
`;
