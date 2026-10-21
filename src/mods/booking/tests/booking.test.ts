import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { env } from '../../../core/config/env.js';
import { BOOKING_GRAPHQL_PATH, GRAPHQL_PATH } from '../../../core/config/graphql.js';
import { currentTotp, TOTP_PERIOD_SECONDS } from '../../../shared/otp/totp.js';
import { addDays, zonedParts } from '../../../shared/time.js';
import {
    app,
    bearer,
    gql as staffGql,
    type GraphQLResponseBody,
} from '../../../tests/graphql.helpers.js';
import { registerTestUser } from '../../auth/tests/auth.helpers.js';
import {
    BookingModel,
    ClientModel,
    RoomModel,
    ServiceModel,
    TherapistModel,
} from '../../schedule/index.js';
import { SmsLogModel, SmsPurpose } from '../../sms/index.js';
import { useTestSms } from '../../sms/tests/sms.helpers.js';

const sms = useTestSms();

async function gql<T = Record<string, unknown>>(
    query: string,
    variables?: Record<string, unknown>,
    headers: Record<string, string> = {},
) {
    const res = await request(app)
        .post(BOOKING_GRAPHQL_PATH)
        .set('Content-Type', 'application/json')
        .set(headers)
        .send({ query, variables });
    return res as typeof res & { body: GraphQLResponseBody<T> };
}
type Res = { body: { errors?: { extensions?: { code?: string } }[] } };
const code = (res: Res) => res.body.errors?.[0]?.extensions?.code;

const tz = env.SCHEDULE_TIMEZONE;
const today = zonedParts(new Date(), tz).dateKey;
const tomorrow = addDays(today, 1);
const at = (date: string, time: string) => new Date(`${date}T${time}:00+08:00`).toISOString();

let ana = '';
let ben = '';
let fuyu = '';
beforeEach(async () => {
    ana = String((await TherapistModel.create({ name: 'Ana Reyes' }))._id);
    ben = String((await TherapistModel.create({ name: 'Ben', leaveDates: [tomorrow] }))._id);
    await RoomModel.create({ name: 'Room 1', color: '#534AB7' });
    fuyu = String(
        (
            await ServiceModel.create({
                name: 'Fuyu',
                prices: [
                    { durationMin: 60, days: [], amount: 1099, validFrom: '2020-01-01' },
                    { durationMin: 80, days: [], amount: 1199, validFrom: '2020-01-01' },
                ],
            })
        )._id,
    );
});

const REQUEST = `mutation ($m: String!, $t: String!) { requestSetupCode(mobile: $m, turnstileToken: $t) { sentTo expiresAt resendAfter } }`;
const VERIFY = `mutation ($m: String!, $c: String!) { verifySetupCode(mobile: $m, code: $c) { setupToken needsName firstName hasApp } }`;
const START = `mutation ($t: String!, $f: String, $l: String) { startAppSetup(setupToken: $t, firstName: $f, lastName: $l) { setupToken secret qrDataUrl } }`;
const CONFIRM = `mutation ($t: String!, $c: String!) { confirmAppSetup(setupToken: $t, code: $c) { token firstName clientId } }`;
const LOGIN = `mutation ($m: String!, $c: String!) { clientLogin(mobile: $m, code: $c) { token firstName } }`;
const SLOTS = `query ($d: String!, $s: ID!, $min: Int!, $th: ID) { availableSlots(date: $d, serviceId: $s, durationMin: $min, therapistId: $th) { start end therapistIds } }`;
const BOOK = `mutation ($input: AppointmentInput!) { bookAppointment(input: $input) { bookingId start therapistName serviceName price durationMin } }`;

/** SMS code -> name -> QR -> first app code. Returns the session token and the app secret. */
async function setUp(mobile = '0917 123 4567', firstName: string | null = 'Juan') {
    const sent = await gql(REQUEST, { m: mobile, t: 'XXXX.DUMMY.TOKEN' });
    expect(sent.body.errors).toBeUndefined();
    const smsCode = sms.outbox.at(-1)!.code!;
    const verified = await gql<{ verifySetupCode: { setupToken: string; needsName: boolean } }>(
        VERIFY,
        {
            m: mobile,
            c: smsCode,
        },
    );
    expect(verified.body.errors).toBeUndefined();
    const started = await gql<{ startAppSetup: { setupToken: string; secret: string } }>(START, {
        t: verified.body.data!.verifySetupCode.setupToken,
        f: firstName,
    });
    expect(started.body.errors).toBeUndefined();
    const { secret, setupToken } = started.body.data!.startAppSetup;
    const confirmed = await gql<{ confirmAppSetup: { token: string } }>(CONFIRM, {
        t: setupToken,
        c: await currentTotp(secret),
    });
    expect(confirmed.body.errors).toBeUndefined();
    return { token: confirmed.body.data!.confirmAppSetup.token, secret };
}

const nextCode = (secret: string) =>
    currentTotp(secret, Math.floor(Date.now() / 1000) + TOTP_PERIOD_SECONDS);

describe('public booking endpoint', () => {
    it('serves only booking operations; staff operations do not exist there', async () => {
        const res = await gql('{ users { total } }');
        expect(res.body.errors?.[0].message).toMatch(/Cannot query field "users"/);
        const staff = await staffGql('{ bookingTherapists { id } }');
        expect(staff.body.errors?.[0].message).toMatch(/Cannot query field "bookingTherapists"/);
    });

    it('has its own CORS list', async () => {
        const booking = await request(app)
            .options(BOOKING_GRAPHQL_PATH)
            .set('Origin', env.BOOKING_CORS_ORIGINS[0])
            .set('Access-Control-Request-Method', 'POST');
        expect(booking.headers['access-control-allow-origin']).toBe(env.BOOKING_CORS_ORIGINS[0]);
        const staff = await request(app)
            .options(GRAPHQL_PATH)
            .set('Origin', env.BOOKING_CORS_ORIGINS[0])
            .set('Access-Control-Request-Method', 'POST');
        expect(staff.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('lists services with prices for a date, and therapists by first name', async () => {
        const res = await gql<{
            bookingServices: unknown[];
            bookingTherapists: { name: string }[];
        }>(
            `query ($d: String!) { bookingServices(date: $d) { name options { durationMin price } } bookingTherapists { name } }`,
            { d: tomorrow },
        );
        expect(res.body.data?.bookingServices).toEqual([
            {
                name: 'Fuyu',
                options: [
                    { durationMin: 60, price: 1099 },
                    { durationMin: 80, price: 1199 },
                ],
            },
        ]);
        expect(res.body.data?.bookingTherapists.map((t: { name: string }) => t.name)).toEqual([
            'Ana',
            'Ben',
        ]);
    });
});

describe('app setup and sign-in', () => {
    it('a new number: SMS code, name, QR, first code -> a client with app sign-in', async () => {
        const sent = await gql<{ requestSetupCode: { sentTo: string } }>(REQUEST, {
            m: '0917 123 4567',
            t: 'x',
        });
        expect(sent.body.data?.requestSetupCode.sentTo).toBe('0917 *** 4567');
        expect(sms.outbox[0].message).toMatch(/^\d{6} is your .* code to set up online booking/);
        expect(await SmsLogModel.findOne({ purpose: SmsPurpose.setupCode }).lean()).toMatchObject({
            message: expect.stringMatching(/^●●●●●● is your/),
        });

        // Wrong code, then the right one
        expect(code(await gql(VERIFY, { m: '09171234567', c: '000000' }))).toBe(
            'INVALID_SETUP_CODE',
        );
        const verified = await gql<{ verifySetupCode: { setupToken: string; needsName: boolean } }>(
            VERIFY,
            {
                m: '+63 917 123 4567',
                c: sms.outbox[0].code,
            },
        );
        expect(verified.body.data?.verifySetupCode.needsName).toBe(true);
        const t = verified.body.data!.verifySetupCode.setupToken;

        expect(code(await gql(START, { t }))).toBe('VALIDATION_ERROR'); // first name needed
        const started = await gql<{
            startAppSetup: { setupToken: string; secret: string; qrDataUrl: string };
        }>(START, { t, f: 'Juan', l: 'Cruz' });
        expect(started.body.data?.startAppSetup.qrDataUrl).toMatch(/^data:image\/png/);
        const client = await ClientModel.findOne({ mobile: '+639171234567' }).lean();
        expect(client).toMatchObject({ firstName: 'Juan', lastName: 'Cruz' });
        expect(client?.app?.enabledAt).toBeFalsy(); // not until the first code

        const { setupToken, secret } = started.body.data!.startAppSetup;
        const done = await gql<{ confirmAppSetup: { firstName: string; token: string } }>(CONFIRM, {
            t: setupToken,
            c: await currentTotp(secret),
        });
        expect(done.body.data?.confirmAppSetup.firstName).toBe('Juan');
        expect((await ClientModel.findById(client!._id).lean())?.app?.enabledAt).toBeTruthy();
    });

    it('limits codes: one a minute per number; 3 wrong tries need a new code', async () => {
        await gql(REQUEST, { m: '09171234567', t: 'x' });
        expect(code(await gql(REQUEST, { m: '09171234567', t: 'x' }))).toBe('SETUP_CODE_TOO_SOON');
        const right = sms.outbox[0].code;
        for (let i = 0; i < 3; i++) await gql(VERIFY, { m: '09171234567', c: '000000' });
        expect(code(await gql(VERIFY, { m: '09171234567', c: right }))).toBe('INVALID_SETUP_CODE');
    });

    it('an existing client keeps their name; a failed text reports SMS_FAILED', async () => {
        await ClientModel.create({ mobile: '+639171234567', firstName: 'Maria' });
        sms.failNext(3);
        expect(code(await gql(REQUEST, { m: '09171234567', t: 'x' }))).toBe('SMS_FAILED');
        // (the failed text still counts for the cooldown, so move it back two minutes)
        await SmsLogModel.collection.updateMany(
            {},
            { $set: { createdAt: new Date(Date.now() - 120_000) } },
        );
        await gql(REQUEST, { m: '09171234567', t: 'x' });
        const verified = await gql<{ verifySetupCode: { needsName: boolean; firstName: string } }>(
            VERIFY,
            {
                m: '09171234567',
                c: sms.outbox[0].code,
            },
        );
        expect(verified.body.data?.verifySetupCode).toMatchObject({
            needsName: false,
            firstName: 'Maria',
        });
    });

    it('clientLogin: same error for unknown numbers and wrong codes; codes work once; staff reset ends sessions', async () => {
        const { token, secret } = await setUp();
        expect(code(await gql(LOGIN, { m: '09999999999', c: '123456' }))).toBe(
            'INVALID_CLIENT_CODE',
        );
        expect(code(await gql(LOGIN, { m: '09171234567', c: '123456' }))).toBe(
            'INVALID_CLIENT_CODE',
        );

        const next = await nextCode(secret);
        const ok = await gql<{ clientLogin: { firstName: string } }>(LOGIN, {
            m: '0917-123-4567',
            c: next,
        });
        expect(ok.body.data?.clientLogin.firstName).toBe('Juan');
        expect(code(await gql(LOGIN, { m: '09171234567', c: next }))).toBe('INVALID_CLIENT_CODE');

        // The session works for slots; a staff token doesn't work here
        const slots = await gql(SLOTS, { d: tomorrow, s: fuyu, min: 60 }, bearer(token));
        expect(slots.body.errors).toBeUndefined();
        const staff = await registerTestUser();
        expect(
            (await gql(SLOTS, { d: tomorrow, s: fuyu, min: 60 }, bearer(staff.token))).status,
        ).toBe(401);

        // Staff reset (lost phone) ends the session
        const client = await ClientModel.findOne({ mobile: '+639171234567' }).lean();
        const desk = await registerTestUser({ email: 'desk@example.com' });
        const reset = await staffGql(
            `mutation ($id: ID!) { resetClientApp(id: $id) { appEnabledAt } }`,
            { id: String(client!._id) },
            bearer(desk.token),
        );
        expect(reset.body.data).toEqual({ resetClientApp: { appEnabledAt: null } });
        expect((await gql(SLOTS, { d: tomorrow, s: fuyu, min: 60 }, bearer(token))).status).toBe(
            401,
        );
    });

    it('5 wrong codes pause sign-in', async () => {
        const { secret } = await setUp();
        for (let i = 0; i < 5; i++) await gql(LOGIN, { m: '09171234567', c: '000000' });
        expect(code(await gql(LOGIN, { m: '09171234567', c: await nextCode(secret) }))).toBe(
            'INVALID_CLIENT_CODE',
        );
    });
});

describe('booking online', () => {
    it('slots skip therapists on leave; booking with a named therapist marks it requested', async () => {
        const { token } = await setUp();
        const anon = await gql(SLOTS, { d: tomorrow, s: fuyu, min: 60 });
        expect(code(anon)).toBe('SESSION_EXPIRED');

        const slots = await gql<{ availableSlots: { start: string; therapistIds: string[] }[] }>(
            SLOTS,
            { d: tomorrow, s: fuyu, min: 60 },
            bearer(token),
        );
        expect(slots.body.errors).toBeUndefined();
        const list = slots.body.data!.availableSlots;
        expect(list[0].start).toBe(at(tomorrow, env.SCHEDULE_OPENING_TIME));
        // Ben is on leave tomorrow, so only Ana is offered
        expect(
            list.every(
                (s: { therapistIds: string[] }) =>
                    s.therapistIds.length === 1 && s.therapistIds[0] === ana,
            ),
        ).toBe(true);
        expect(new Date(list.at(-1)!.start).getTime() + 3600_000).toBeLessThanOrEqual(
            new Date(at(tomorrow, env.SCHEDULE_CLOSING_TIME)).getTime(),
        );

        const booked = await gql<{
            bookAppointment: { therapistName: string; price: number; bookingId: string };
        }>(
            BOOK,
            { input: { serviceId: fuyu, durationMin: 60, start: list[0].start, therapistId: ana } },
            bearer(token),
        );
        expect(booked.body.errors).toBeUndefined();
        expect(booked.body.data?.bookAppointment).toMatchObject({
            therapistName: 'Ana',
            price: 1099,
        });
        const stored = await BookingModel.findById(
            booked.body.data!.bookAppointment.bookingId,
        ).lean();
        expect(stored).toMatchObject({
            source: 'client',
            isRequested: true,
            client: 'Juan',
            clientMobile: '+639171234567',
        });

        // The slot is gone, and Ben can't be booked on his leave day
        const again = await gql(
            BOOK,
            { input: { serviceId: fuyu, durationMin: 60, start: list[0].start } },
            bearer(token),
        );
        expect(code(again)).toBe('SLOT_TAKEN');
        const withBen = await gql(
            BOOK,
            { input: { serviceId: fuyu, durationMin: 60, start: list[2].start, therapistId: ben } },
            bearer(token),
        );
        expect(code(withBen)).toBe('SLOT_TAKEN');
    });

    it('"any therapist" is not marked requested', async () => {
        const { token } = await setUp();
        const res = await gql<{ bookAppointment: { bookingId: string } }>(
            BOOK,
            {
                input: {
                    serviceId: fuyu,
                    durationMin: 80,
                    start: at(tomorrow, '14:00'),
                    therapistId: null,
                },
            },
            bearer(token),
        );
        expect(res.body.errors).toBeUndefined();
        expect(
            (await BookingModel.findById(res.body.data!.bookAppointment.bookingId).lean())
                ?.isRequested,
        ).toBe(false);
    });

    it('only within the window: 2 hours ahead to 7 days; priced lengths only; 3 upcoming at most', async () => {
        const { token } = await setUp();
        const tooFar = addDays(today, env.BOOKING_DAYS_AHEAD + 1);
        expect(code(await gql(SLOTS, { d: tooFar, s: fuyu, min: 60 }, bearer(token)))).toBe(
            'OUTSIDE_BOOKING_WINDOW',
        );
        const soon = new Date(Date.now() + 30 * 60_000).toISOString();
        expect(
            code(
                await gql(
                    BOOK,
                    { input: { serviceId: fuyu, durationMin: 60, start: soon } },
                    bearer(token),
                ),
            ),
        ).toBe('OUTSIDE_BOOKING_WINDOW');
        expect(code(await gql(SLOTS, { d: tomorrow, s: fuyu, min: 90 }, bearer(token)))).toBe(
            'VALIDATION_ERROR',
        );

        for (const time of ['10:00', '12:00', '14:00']) {
            const ok = await gql(
                BOOK,
                { input: { serviceId: fuyu, durationMin: 60, start: at(tomorrow, time) } },
                bearer(token),
            );
            expect(ok.body.errors).toBeUndefined();
        }
        const fourth = await gql(
            BOOK,
            { input: { serviceId: fuyu, durationMin: 60, start: at(tomorrow, '16:00') } },
            bearer(token),
        );
        expect(code(fourth)).toBe('TOO_MANY_BOOKINGS');
    });
});
