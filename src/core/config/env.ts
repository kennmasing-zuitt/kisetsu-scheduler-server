import { cleanEnv, num, port, str } from 'envalid';
import { commaList, mongoUri, secret } from './utils/validators.js';

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
    BCRYPT_SALT_ROUNDS: num({ default: 10 }),
    CORS_ORIGINS: commaList({ devDefault: ['http://localhost:5173'] }),
    AUTH_RATE_LIMIT_MAX: num({ default: 5, devDefault: 50 }),
    API_RATE_LIMIT_MAX: num({ default: 300, devDefault: 1000 }),
    TRUST_PROXY: num({ default: 0 }),
});
