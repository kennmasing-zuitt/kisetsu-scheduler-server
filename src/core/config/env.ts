import { cleanEnv, num, port, str } from 'envalid';
import { commaList, hhmm, mongoUri, secret, timeZone } from './utils/validators.js';

export const env = cleanEnv(process.env, {
    NODE_ENV: str({
        choices: ['development', 'production', 'test'],
        default: 'development',
    }),
    PORT: port({ default: 3000 }),
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
    CORS_ORIGINS: commaList({ devDefault: ['http://localhost:5173'] }),
    AUTH_RATE_LIMIT_MAX: num({ default: 5, devDefault: 50 }),
    API_RATE_LIMIT_MAX: num({ default: 300, devDefault: 1000 }),
    TRUST_PROXY: num({ default: 0 }),
    // Schedule rules: the business's time zone (weekdays, leave dates and opening hours are
    // evaluated in it) and the opening hours every booking must fit in
    SCHEDULE_TIMEZONE: timeZone({ default: 'Asia/Manila' }),
    SCHEDULE_OPENING_TIME: hhmm({ default: '10:00' }),
    SCHEDULE_CLOSING_TIME: hhmm({ default: '22:00' }),
});
