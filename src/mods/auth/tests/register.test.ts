import bcrypt from 'bcryptjs';
import { describe, it, expect } from 'vitest';
import { gql } from '../../../tests/graphql.helpers.js';
import { UserModel } from '../../users/db/user.model.js';
import { REGISTER_MUTATION, registerTestUser, testUser } from './auth.helpers.js';

interface RegisterData {
    register: {
        message: string;
        user: { id: string; name: string; email: string; roles: { key: string }[] };
    };
}

describe('mutation register', () => {
    it('creates a user, hashes the password and never exposes it', async () => {
        const res = await gql<RegisterData>(REGISTER_MUTATION, { input: testUser });

        expect(res.status).toBe(200);
        expect(res.body.errors).toBeUndefined();
        expect(res.body.data?.register.message).toBe('Registered! You can now log in.');
        expect(res.body.data?.register.user).toMatchObject({
            name: testUser.name,
            email: testUser.email,
            roles: [{ key: 'user' }],
        });

        const stored = await UserModel.findOne({ email: testUser.email }).select('+password');
        expect(stored).toBeTruthy();
        expect(stored!.password).not.toBe(testUser.password);
        expect(await bcrypt.compare(testUser.password, stored!.password)).toBe(true);
    });

    it('normalises the email to lowercase', async () => {
        const res = await gql<RegisterData>(REGISTER_MUTATION, {
            input: { ...testUser, email: '  Mixed.Case@Example.COM ' },
        });
        expect(res.body.data?.register.user.email).toBe('mixed.case@example.com');
    });

    it('rejects a duplicate email with EMAIL_TAKEN (409)', async () => {
        await registerTestUser(); // seed via service
        const res = await gql(REGISTER_MUTATION, { input: testUser });

        expect(res.body.data).toBeNull();
        expect(res.body.errors?.[0].extensions).toMatchObject({ code: 'EMAIL_TAKEN', status: 409 });
    });

    it('rejects invalid input with VALIDATION_ERROR and Zod details', async () => {
        const res = await gql(REGISTER_MUTATION, {
            input: { name: ' ', email: 'not-an-email', password: 'short' },
        });

        const ext = res.body.errors?.[0].extensions;
        expect(ext?.code).toBe('VALIDATION_ERROR');
        const paths = (ext?.details as { path: string[] }[]).map((i) => i.path[0]).sort();
        expect(paths).toEqual(['email', 'name', 'password']);
    });

    it('rejects a missing required field at the GraphQL layer', async () => {
        const res = await gql(REGISTER_MUTATION, {
            input: { name: 'x', email: 'x@example.com' },
        });
        expect(res.status).toBe(400);
        expect(res.body.errors?.[0].extensions?.code).toBe('BAD_USER_INPUT');
    });

    it('does not allow querying the password field', async () => {
        const res = await gql(`mutation {
            register(input: { name: "A", email: "a@example.com", password: "Password123!" }) {
                user { password }
            }
        }`);
        expect(res.status).toBe(400);
        expect(res.body.errors?.[0].extensions?.code).toBe('GRAPHQL_VALIDATION_FAILED');
    });
});
