import { Permission, RoleKind, RoleModel, SUPER_ADMIN_ROLE_KEY } from '../../roles/index.js';
import { UsersOperations } from '../../users/index.js';
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

/** Creates a role directly in the DB (no rules) and returns its key. */
export async function createRoleDoc(key: string, kind: RoleKind, perms: Permission[]) {
    await RoleModel.create({ key, name: key, kind, perms });
    return key;
}

/**
 * Seeds an admin and returns a valid token. With no perms they get the super-admin role;
 * otherwise a dedicated admin-kind role holding exactly `perms`.
 * Access is re-read from the DB on every request, so the token reflects it immediately.
 */
export async function createAdmin(perms?: Permission[], overrides: Partial<typeof testUser> = {}) {
    const slug = perms ? perms.join('-').toLowerCase() || 'none' : 'super';
    const admin = await registerTestUser({
        email: `admin.${slug}@example.com`,
        name: 'Admin',
        ...overrides,
    });
    const role = perms
        ? await createRoleDoc(`admin-${slug}`.slice(0, 40), RoleKind.admin, perms)
        : SUPER_ADMIN_ROLE_KEY;
    await UsersOperations.setAccess(admin.user.id, role, []);
    return admin;
}

/** Gives a user (any role) extra per-user permissions. */
export const grantExtraPerms = (userId: string, role: string, perms: Permission[]) =>
    UsersOperations.setAccess(userId, role, perms);

export const REGISTER_MUTATION = /* GraphQL */ `
    mutation Register($input: RegisterInput!) {
        register(input: $input) {
            message
            token
            user {
                id
                name
                email
                role {
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
            role {
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
