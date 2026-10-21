import { cleanEnv, num, port, str, url } from 'envalid';
import { aesKey, commaList, hhmm, mongoUri, secret, timeZone } from './utils/validators.js';

export const env = cleanEnv(process.env, {
    NODE_ENV: str({
        choices: ['development', 'production', 'test'],
        default: 'development',
    }),
    PORT: port({ default: 2200 }),
    LOG_LEVEL: str({
        choices: ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'],
        default: 'info',
        devDefault: 'debug',
    }),
    MONGO_URI: mongoUri({
        devDefault: 'mongodb://localhost:27017/express-graphql-boilerplate',
    }),
    JWT_SECRET: secret({
        devDefault: 'dev-only-secret-change-me-0123456789abcdef',
    }),
    JWT_EXPIRES_IN: str({ default: '1h' }),
    // Lifetime of tokens issued by impersonateUser (short on purpose)
    IMPERSONATION_TOKEN_TTL: str({ default: '15m' }),
    BCRYPT_SALT_ROUNDS: num({ default: 10 }),
    CORS_ORIGINS: commaList({ devDefault: ['http://localhost:2400'] }),
    AUTH_RATE_LIMIT_MAX: num({ default: 5, devDefault: 50 }),
    API_RATE_LIMIT_MAX: num({ default: 300, devDefault: 1000 }),
    TRUST_PROXY: num({ default: 0 }),
    // Schedule rules: the business's time zone (weekdays, leave dates and opening hours are
    // evaluated in it) and the opening hours every booking must fit in
    SCHEDULE_TIMEZONE: timeZone({ default: 'Asia/Manila' }),
    SCHEDULE_OPENING_TIME: hhmm({ default: '10:00' }),
    SCHEDULE_CLOSING_TIME: hhmm({ default: '22:00' }),

    // Business name used in texts and as the account name in Google Authenticator
    BUSINESS_NAME: str({ default: 'Kisetsu Spa' }),

    // ---- Authenticator codes (staff 2FA and client app sign-in) ----
    // 32 random bytes, base64. Encrypts the authenticator secrets stored in MongoDB.
    TOTP_ENCRYPTION_KEY: aesKey({ devDefault: 'ZGV2LW9ubHktdG90cC1rZXktMzItYnl0ZXMtbG9uZyE=' }),

    // ---- Public booking site (kisetsuspa.com/book) ----
    BOOKING_CORS_ORIGINS: commaList({ devDefault: ['http://localhost:2500'] }),
    // Link put in SMS messages ("please rebook at ...")
    PUBLIC_BOOKING_URL: url({ devDefault: 'http://localhost:2500/book' }),
    // Requests per 15 minutes per IP on /booking/graphql
    BOOKING_RATE_LIMIT_MAX: num({ default: 120, devDefault: 2000 }),
    // How far ahead clients may book online, and the minimum notice
    BOOKING_DAYS_AHEAD: num({ default: 7 }),
    BOOKING_MIN_LEAD_MINUTES: num({ default: 120 }),
    // Phone number quoted in SMS messages ("or call us at ...")
    SPA_PHONE: str({ default: '' }),

    // ---- SMS ----
    // console: print messages to the log (development). semaphore: send through semaphore.co
    SMS_PROVIDER: str({ choices: ['console', 'semaphore'], default: 'console' }),
    SEMAPHORE_API_KEY: str({ default: '' }),
    SEMAPHORE_SENDER_NAME: str({ default: 'KISETSUSPA' }),

    // ---- Cloudflare Turnstile (bot check before sending SMS codes) ----
    // The dev default is Cloudflare's test secret that accepts every token
    TURNSTILE_SECRET_KEY: str({ devDefault: '1x0000000000000000000000000000000AA' }),
});
