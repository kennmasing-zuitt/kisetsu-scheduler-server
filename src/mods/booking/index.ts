import type { AppModule } from '../../shared/shared.types.js';
import { BookingHandlers } from './controllers/index.js';

/**
 * The public booking site's API (kisetsuspa.com/book), served on its own endpoint,
 * /booking/graphql, with its own schema: only these resolvers exist there, so nothing from the
 * staff API can be reached through it. Clients sign in with an authenticator code (set up
 * after proving their number by SMS); staff tokens are not accepted.
 */
export * as BookingOperations from './db/repository/index.js';
export * as BookingImpl from './service/index.js';
export { BookingHandlers };
export { MobileVerificationModel } from './db/mobileVerification.model.js';
export type * from './db/_booking.types.js';

/**
 * Every root operation of the public endpoint. Only these are served on /booking/graphql, and
 * none of them on the staff /graphql (core/graphql/schema.ts splits one built schema by them).
 */
export const BOOKING_OPERATIONS = {
    queries: ['bookingWindow', 'bookingServices', 'bookingTherapists', 'availableSlots'],
    mutations: [
        'requestSetupCode',
        'verifySetupCode',
        'startAppSetup',
        'confirmAppSetup',
        'clientLogin',
        'bookAppointment',
    ],
} as const;

export const bookingModule: AppModule = {
    name: 'booking',
    resolvers: Object.values(BookingHandlers),
};
