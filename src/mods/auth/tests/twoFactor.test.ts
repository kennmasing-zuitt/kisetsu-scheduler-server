import { afterEach, describe, expect, it, vi } from 'vitest';
import { bearer, gql } from '../../../tests/graphql.helpers.js';
import { currentTotp, TOTP_PERIOD_SECONDS } from '../../../shared/otp/totp.js';
import { UserModel } from '../../users/index.js';
import { AuditAction, AuditLogModel } from '../../audit/index.js';
import { Permission } from '../../roles/index.js';
import { createAdmin, registerTestUser, testUser } from './auth.helpers.js';

const LOGIN = `mutation ($input: LoginInput!) {
    login(input: $input) { token twoFactorRequired twoFactorSetupRequired challengeToken user { id } }
}`;
const LOGIN_2FA = `mutation ($t: String!, $c: String!) { loginTwoFactor(challengeToken: $t, code: $c) { token user { id twoFactorEnabled } } }`;
const SETUP = `mutation ($t: String) { setupTwoFactor(challengeToken: $t) { secret otpauthUrl qrDataUrl } }`;
const CONFIRM = `mutation ($c: String!, $t: String) { confirmTwoFactor(code: $c, challengeToken: $t) { token recoveryCodes user { twoFactorEnabled } } }`;
const DISABLE = `mutation ($p: String!, $c: String!) { disableTwoFactor(password: $p, code: $c) }`;
const REGEN = `mutation ($c: String!) { regenerateRecoveryCodes(code: $c) }`;
const RESET = `mutation ($id: ID!) { resetUserTwoFactor(userId: $id) }`;
const ME = `{ me { id twoFactorEnabled } session { twoFactorRequired } }`;

interface LoginData {
    token: string | null;
    twoFactorRequired: boolean;
    twoFactorSetupRequired: boolean;
    challengeToken: string | null;
}

type Res = { body: { errors?: { extensions?: { code?: string } }[] } };
const code = (res: Res) => res.body.errors?.[0]?.extensions?.code;

const login = (email = testUser.email, password = testUser.password) =>
    gql<{ login: LoginData }>(LOGIN, { input: { email, password } });

/** A code from a later 30-second step than `secret`'s last used one (each code works once). */
const nextCode = (secret: string, stepsAhead = 1) =>
    currentTotp(secret, Math.floor(Date.now() / 1000) + stepsAhead * TOTP_PERIOD_SECONDS);

/** Turns 2FA on for a signed-in user; returns the secret and recovery codes. */
async function enable(token: string) {
    const setup = await gql<{ setupTwoFactor: { secret: string } }>(SETUP, {}, bearer(token));
    expect(setup.body.errors).toBeUndefined();
    const secret = setup.body.data!.setupTwoFactor.secret;
    const confirm = await gql<{ confirmTwoFactor: { recoveryCodes: string[] } }>(
        CONFIRM,
        { c: await currentTotp(secret) },
        bearer(token),
    );
    expect(confirm.body.errors).toBeUndefined();
    return { secret, recoveryCodes: confirm.body.data!.confirmTwoFactor.recoveryCodes };
}

afterEach(() => {
    vi.useRealTimers();
});

describe('two-factor sign-in (staff)', () => {
    it('is optional for user roles: login returns a token straight away', async () => {
        await registerTestUser();
        const res = await login();
        expect(res.body.data?.login).toMatchObject({
            twoFactorRequired: false,
            twoFactorSetupRequired: false,
        });
        expect(res.body.data?.login.token).toBeTruthy();
        const me = await gql<{ session: { twoFactorRequired: boolean } }>(
            ME,
            {},
            bearer(res.body.data!.login.token!),
        );
        expect(me.body.data?.session.twoFactorRequired).toBe(false);
    });

    it('setup: QR + first code turns it on, with 10 recovery codes; secrets are sealed in the DB', async () => {
        const { user, token } = await registerTestUser();
        const setup = await gql<{
            setupTwoFactor: { secret: string; otpauthUrl: string; qrDataUrl: string };
        }>(SETUP, {}, bearer(token));
        expect(setup.body.data?.setupTwoFactor.otpauthUrl).toMatch(/^otpauth:\/\/totp\//);
        expect(setup.body.data?.setupTwoFactor.qrDataUrl).toMatch(/^data:image\/png;base64,/);

        const wrong = await gql(CONFIRM, { c: '000000' }, bearer(token));
        expect(code(wrong)).toBe('INVALID_TWO_FACTOR_CODE');

        const secret = setup.body.data!.setupTwoFactor.secret;
        const ok = await gql<{
            confirmTwoFactor: { recoveryCodes: string[]; user: { twoFactorEnabled: boolean } };
        }>(CONFIRM, { c: await currentTotp(secret) }, bearer(token));
        expect(ok.body.data?.confirmTwoFactor.recoveryCodes).toHaveLength(10);
        expect(ok.body.data?.confirmTwoFactor.user.twoFactorEnabled).toBe(true);

        const stored = await UserModel.findById(
            user.id,
            '+twoFactor.secret +twoFactor.recoveryCodes',
        ).lean();
        expect(stored?.twoFactor?.secret).toMatch(/^v1\./);
        expect(stored?.twoFactor?.secret).not.toContain(secret);
        expect(stored?.twoFactor?.recoveryCodes?.[0]).toMatch(/^[a-f0-9]{64}$/);

        const again = await gql(SETUP, {}, bearer(token));
        expect(code(again)).toBe('TWO_FACTOR_ALREADY_ENABLED');
    });

    it('login then needs the code; each code works once; recovery codes are single-use', async () => {
        const { token } = await registerTestUser();
        const { secret, recoveryCodes } = await enable(token);

        const step1 = await login();
        expect(step1.body.data?.login).toMatchObject({ token: null, twoFactorRequired: true });
        const challenge = step1.body.data!.login.challengeToken!;

        // The challenge token is not an access token
        const asAccess = await gql(ME, {}, bearer(challenge));
        expect(asAccess.status).toBe(401);

        const wrong = await gql(LOGIN_2FA, { t: challenge, c: '123456' });
        expect(code(wrong)).toBe('INVALID_TWO_FACTOR_CODE');

        const next = await nextCode(secret);
        const ok = await gql<{ loginTwoFactor: { token: string } }>(LOGIN_2FA, {
            t: challenge,
            c: next,
        });
        expect(ok.body.errors).toBeUndefined();
        const me = await gql<{ me: { twoFactorEnabled: boolean } }>(
            ME,
            {},
            bearer(ok.body.data!.loginTwoFactor.token),
        );
        expect(me.body.data?.me.twoFactorEnabled).toBe(true);

        // Same code again (replay) is refused
        const replay = await gql(LOGIN_2FA, { t: challenge, c: next });
        expect(code(replay)).toBe('INVALID_TWO_FACTOR_CODE');

        // Recovery code, written with capitals and a space, once
        const recovery = recoveryCodes[0].toUpperCase().replace('-', ' ');
        const viaRecovery = await gql(LOGIN_2FA, { t: challenge, c: recovery });
        expect(viaRecovery.body.errors).toBeUndefined();
        const reused = await gql(LOGIN_2FA, { t: challenge, c: recoveryCodes[0] });
        expect(code(reused)).toBe('INVALID_TWO_FACTOR_CODE');
    });

    it('5 wrong codes in a row lock 2FA for 15 minutes', async () => {
        const { token } = await registerTestUser();
        const { secret } = await enable(token);
        const challenge = (await login()).body.data!.login.challengeToken!;
        for (let i = 0; i < 5; i++) await gql(LOGIN_2FA, { t: challenge, c: '000000' });
        const locked = await gql(LOGIN_2FA, { t: challenge, c: await nextCode(secret) });
        expect(code(locked)).toBe('TWO_FACTOR_LOCKED');
    });

    it('5 wrong codes while confirming setup also lock 2FA', async () => {
        const { token } = await registerTestUser();
        const setup = await gql<{ setupTwoFactor: { secret: string } }>(SETUP, {}, bearer(token));
        const secret = setup.body.data!.setupTwoFactor.secret;
        for (let i = 0; i < 5; i++) await gql(CONFIRM, { c: '000000' }, bearer(token));
        const locked = await gql(CONFIRM, { c: await currentTotp(secret) }, bearer(token));
        expect(code(locked)).toBe('TWO_FACTOR_LOCKED');
    });

    it('a logout (tokenVersion change) ends a pending challenge', async () => {
        const { user, token } = await registerTestUser();
        const { secret } = await enable(token);
        const challenge = (await login()).body.data!.login.challengeToken!;
        await UserModel.updateOne({ _id: user.id }, { $inc: { tokenVersion: 1 } });
        const res = await gql(LOGIN_2FA, { t: challenge, c: await nextCode(secret) });
        expect(code(res)).toBe('TWO_FACTOR_CHALLENGE_EXPIRED');
    });

    it('admin roles must set it up during sign-in, using the challenge token', async () => {
        await createAdmin(undefined, { email: 'boss@example.com' });
        const step1 = await login('boss@example.com');
        expect(step1.body.data?.login).toMatchObject({ token: null, twoFactorSetupRequired: true });
        const t = step1.body.data!.login.challengeToken!;

        const setup = await gql<{ setupTwoFactor: { secret: string } }>(SETUP, { t });
        const secret = setup.body.data!.setupTwoFactor.secret;
        const done = await gql<{ confirmTwoFactor: { token: string; recoveryCodes: string[] } }>(
            CONFIRM,
            {
                t,
                c: await currentTotp(secret),
            },
        );
        expect(done.body.data?.confirmTwoFactor.recoveryCodes).toHaveLength(10);
        const session = await gql<{ session: { twoFactorRequired: boolean } }>(
            ME,
            {},
            bearer(done.body.data!.confirmTwoFactor.token),
        );
        expect(session.body.data?.session.twoFactorRequired).toBe(true);

        // Next sign-in asks for the code; admins can't turn it off
        expect((await login('boss@example.com')).body.data?.login.twoFactorRequired).toBe(true);
        const off = await gql(
            DISABLE,
            { p: testUser.password, c: await nextCode(secret) },
            bearer(done.body.data!.confirmTwoFactor.token),
        );
        expect(code(off)).toBe('TWO_FACTOR_REQUIRED');
    });

    it('users can turn it off with password + code, and regenerate recovery codes', async () => {
        const { token } = await registerTestUser();
        const { secret, recoveryCodes } = await enable(token);

        const regen = await gql<{ regenerateRecoveryCodes: string[] }>(
            REGEN,
            { c: await nextCode(secret) },
            bearer(token),
        );
        expect(regen.body.data?.regenerateRecoveryCodes).toHaveLength(10);
        expect(regen.body.data?.regenerateRecoveryCodes).not.toContain(recoveryCodes[0]);

        // A minute later (codes work once, so the next one comes from a later step)
        vi.useFakeTimers({ toFake: ['Date'], now: Date.now() + 60_000 });
        const badPassword = await gql(
            DISABLE,
            { p: 'nope', c: await currentTotp(secret) },
            bearer(token),
        );
        expect(code(badPassword)).toBe('WRONG_PASSWORD');
        const off = await gql(
            DISABLE,
            { p: testUser.password, c: await currentTotp(secret) },
            bearer(token),
        );
        expect(off.body.errors).toBeUndefined();
        expect(off.body.data).toEqual({ disableTwoFactor: true });
        expect((await login()).body.data?.login.token).toBeTruthy();
    });

    it('resetUserTwoFactor: needs resetTwoFactor, signs the user out, is audited; only a super admin resets admins', async () => {
        const { user, token } = await registerTestUser();
        await enable(token);
        const helpdesk = await createAdmin([Permission.resetTwoFactor], {
            email: 'help@example.com',
        });
        const plainUser = await registerTestUser({ email: 'other@example.com' });

        const denied = await gql(RESET, { id: user.id }, bearer(plainUser.token));
        expect(code(denied)).toBe('FORBIDDEN');

        const ok = await gql(RESET, { id: user.id }, bearer(helpdesk.token));
        expect(ok.body.data).toEqual({ resetUserTwoFactor: true });
        expect((await gql(ME, {}, bearer(token))).status).toBe(401); // signed out
        expect((await login()).body.data?.login.token).toBeTruthy(); // 2FA off
        expect(
            await AuditLogModel.countDocuments({
                action: AuditAction.twoFactorReset,
                targetId: user.id,
            }),
        ).toBe(1);

        const boss = await createAdmin(undefined, { email: 'boss@example.com' });
        const notForAdmins = await gql(RESET, { id: boss.user.id }, bearer(helpdesk.token));
        expect(code(notForAdmins)).toBe('FORBIDDEN');
        const self = await gql(RESET, { id: helpdesk.user.id }, bearer(helpdesk.token));
        expect(code(self)).toBe('CANNOT_MODIFY_SELF');
    });
});
