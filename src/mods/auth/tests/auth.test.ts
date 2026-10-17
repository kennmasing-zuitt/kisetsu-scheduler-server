import jwt from 'jsonwebtoken';
import { describe, it, expect } from 'vitest';
import { env } from '../../../core/config/env.js';
import { bearer, gql } from '../../../tests/graphql.helpers.js';
import { UserModel } from '../../users/index.js';
import {
    CHANGE_PASSWORD_MUTATION,
    LOGIN_MUTATION,
    LOGOUT_MUTATION,
    ME_QUERY,
    registerTestUser,
    testUser,
} from './auth.helpers.js';

interface AuthData {
    token: string;
    user: { id: string; email: string };
}

const login = (email: string, password: string) =>
    gql<{ login: AuthData }>(LOGIN_MUTATION, { input: { email, password } });

const me = (token?: string) =>
    gql<{ me: { id: string; email: string } }>(ME_QUERY, undefined, token ? bearer(token) : {});

describe('token versioning', () => {
    it('signs { sub, ver, role } with HS256 and an expiry from JWT_EXPIRES_IN', async () => {
        const { user, token } = await registerTestUser();
        const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
        const claims = jwt.decode(token) as jwt.JwtPayload;

        expect(header.alg).toBe('HS256');
        expect(claims).toMatchObject({ sub: user.id, ver: 0, role: 'user' });
        expect(claims.exp! - claims.iat!).toBe(60 * 60); // JWT_EXPIRES_IN=1h
    });

    it('new users start at tokenVersion 0', async () => {
        await registerTestUser();
        const stored = await UserModel.findOne({ email: testUser.email });
        expect(stored!.tokenVersion).toBe(0);
    });

    it('rejects a token whose ver no longer matches with HTTP 401', async () => {
        const { user, token } = await registerTestUser();
        await UserModel.updateOne({ _id: user.id }, { $inc: { tokenVersion: 1 } });

        const res = await me(token);
        expect(res.status).toBe(401);
        expect(res.body.errors?.[0].extensions?.code).toBe('UNAUTHENTICATED');
    });

    it('rejects expired, tampered, wrong-algorithm and malformed tokens with 401', async () => {
        const { user } = await registerTestUser();
        const expired = jwt.sign(
            { sub: user.id, ver: 0, role: 'user', exp: Math.floor(Date.now() / 1000) - 10 },
            env.JWT_SECRET,
        );
        const wrongSecret = jwt.sign({ sub: user.id, ver: 0, role: 'user' }, 'x'.repeat(40));
        const hs512 = jwt.sign({ sub: user.id, ver: 0, role: 'user' }, env.JWT_SECRET, {
            algorithm: 'HS512',
        });
        const unsigned = jwt.sign({ sub: user.id, ver: 0, role: 'user' }, '', {
            algorithm: 'none',
        });

        for (const token of [expired, wrongSecret, hs512, unsigned, 'not-a-jwt']) {
            const res = await me(token);
            expect(res.status, token).toBe(401);
        }
        const expiredRes = await me(expired);
        expect(expiredRes.body.errors?.[0].message).toBe('Token expired');

        const noBearer = await gql(ME_QUERY, undefined, { Authorization: 'Token abc' });
        expect(noBearer.status).toBe(401);
    });

    it('anonymous requests still work for public operations', async () => {
        const res = await gql<{ health: string }>('{ health }');
        expect(res.body.data?.health).toBe('ok');
    });
});

describe('mutation login', () => {
    it('returns a token and the user, never the hash', async () => {
        await registerTestUser();
        const res = await gql<{ login: AuthData & { user: Record<string, unknown> } }>(
            `mutation ($input: LoginInput!) { login(input: $input) { token user { id email } } }`,
            { input: { email: '  TEST@example.com ', password: testUser.password } },
        );

        expect(res.body.errors).toBeUndefined();
        expect(res.body.data?.login.user.email).toBe(testUser.email);
        expect(res.body.data?.login.user).not.toHaveProperty('password');
        expect((await me(res.body.data!.login.token)).body.data?.me.email).toBe(testUser.email);
    });

    it('returns the same 401 INVALID_CREDENTIALS for unknown email and wrong password', async () => {
        await registerTestUser();
        const unknown = await login('nobody@example.com', testUser.password);
        const wrong = await login(testUser.email, 'WrongPassword1!');

        for (const res of [unknown, wrong]) {
            expect(res.body.data).toBeNull();
            expect(res.body.errors?.[0].extensions).toMatchObject({
                code: 'INVALID_CREDENTIALS',
                status: 401,
            });
        }
        expect(unknown.body.errors?.[0].message).toBe(wrong.body.errors?.[0].message);
    });

    it('validates input', async () => {
        const res = await login('not-an-email', '');
        expect(res.body.errors?.[0].extensions?.code).toBe('VALIDATION_ERROR');
    });
});

describe('query me', () => {
    it('returns the current user from the token', async () => {
        const { user, token } = await registerTestUser();
        const res = await me(token);
        expect(res.body.data?.me).toMatchObject({ id: user.id, email: testUser.email });
    });

    it('requires a token', async () => {
        const res = await me();
        expect(res.body.data).toBeNull();
        expect(res.body.errors?.[0].extensions).toMatchObject({
            code: 'UNAUTHENTICATED',
            status: 401,
        });
    });
});

describe('mutation logout', () => {
    it('requires a token', async () => {
        const res = await gql(LOGOUT_MUTATION);
        expect(res.body.errors?.[0].extensions?.code).toBe('UNAUTHENTICATED');
    });

    it('increments tokenVersion and revokes the token on every device', async () => {
        const { token: deviceA } = await registerTestUser();
        const deviceB = (await login(testUser.email, testUser.password)).body.data!.login.token;

        const res = await gql<{ logout: boolean }>(LOGOUT_MUTATION, undefined, bearer(deviceA));
        expect(res.body.data?.logout).toBe(true);

        expect((await UserModel.findOne({ email: testUser.email }))!.tokenVersion).toBe(1);
        expect((await me(deviceA)).status).toBe(401);
        expect((await me(deviceB)).status).toBe(401);

        // Logging in again issues a token for the new version
        const fresh = (await login(testUser.email, testUser.password)).body.data!.login.token;
        expect((await me(fresh)).body.data?.me.email).toBe(testUser.email);
    });
});

describe('mutation changePassword', () => {
    const NEW_PASSWORD = 'NewPassword456!';
    const change = (token: string, currentPassword: string, newPassword: string) =>
        gql<{ changePassword: AuthData }>(
            CHANGE_PASSWORD_MUTATION,
            { input: { currentPassword, newPassword } },
            bearer(token),
        );

    it('requires a token', async () => {
        const res = await gql(CHANGE_PASSWORD_MUTATION, {
            input: { currentPassword: 'a', newPassword: NEW_PASSWORD },
        });
        expect(res.body.errors?.[0].extensions?.code).toBe('UNAUTHENTICATED');
    });

    it('rejects a wrong current password with 403 WRONG_PASSWORD', async () => {
        const { token } = await registerTestUser();
        const res = await change(token, 'WrongPassword1!', NEW_PASSWORD);
        expect(res.body.errors?.[0].extensions).toMatchObject({
            code: 'WRONG_PASSWORD',
            status: 403,
        });
        // Nothing changed: the old password and token still work
        expect((await me(token)).status).toBe(200);
        expect((await login(testUser.email, testUser.password)).body.errors).toBeUndefined();
    });

    it('rejects a new password equal to the current one', async () => {
        const { token } = await registerTestUser();
        const res = await change(token, testUser.password, testUser.password);
        expect(res.body.errors?.[0].extensions?.code).toBe('VALIDATION_ERROR');
    });

    it('saves the new hash, revokes old tokens and returns a fresh one', async () => {
        const { token: oldToken } = await registerTestUser();
        const otherDevice = (await login(testUser.email, testUser.password)).body.data!.login.token;

        const res = await change(oldToken, testUser.password, NEW_PASSWORD);
        expect(res.body.errors).toBeUndefined();
        const freshToken = res.body.data!.changePassword.token;

        expect((await me(oldToken)).status).toBe(401);
        expect((await me(otherDevice)).status).toBe(401);
        expect((await me(freshToken)).body.data?.me.email).toBe(testUser.email);

        expect(
            (await login(testUser.email, testUser.password)).body.errors?.[0].extensions?.code,
        ).toBe('INVALID_CREDENTIALS');
        expect((await login(testUser.email, NEW_PASSWORD)).body.errors).toBeUndefined();

        const stored = await UserModel.findOne({ email: testUser.email }).select('+password');
        expect(stored!.password).not.toBe(NEW_PASSWORD);
        expect(stored!.tokenVersion).toBe(1);
    });
});
