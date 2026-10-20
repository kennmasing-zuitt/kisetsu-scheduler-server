import type { AppModule } from '../../shared/shared.types.js';
import { ScheduleHandlers } from './controllers/index.js';

/**
 * Module root: the only file other modules should import from.
 * The schedule: therapists (calendar columns, weekly days off, leave), rooms, and bookings that
 * tie a client to a therapist and a room for a time range. Same layout as src/mods/_example:
 *
 *   db/                                 Mongoose models, TS types, Zod input rules (per entity)
 *   db/repository/operations/*.ts       data access, one file per operation
 *   db/repository/index.ts              barrel                 -> ScheduleOperations.*
 *   service/impl/*.ts                   business logic, one file per use case
 *                                       (assertBookingAllowed.ts holds the booking rules)
 *   service/index.ts                    barrel                 -> ScheduleImpl.*
 *   controllers/handlers/*.ts           GraphQL resolvers, one class per operation
 *   controllers/index.ts                domain namespace       -> ScheduleHandlers
 *   dto/                                GraphQL object/input types (type-graphql), per entity
 */
export * as ScheduleOperations from './db/repository/index.js';
export * as ScheduleImpl from './service/index.js';
export { ScheduleHandlers };
export { BookingModel } from './db/booking.model.js';
export { RoomModel } from './db/room.model.js';
export { TherapistModel } from './db/therapist.model.js';
export { MAX_BOOKING_MINUTES, MAX_RANGE_DAYS } from './db/booking.zod.js';
export * from './dto/booking.dto.js';
export * from './dto/room.dto.js';
export * from './dto/therapist.dto.js';
export type * from './db/_schedule.types.js';

export const scheduleModule: AppModule = {
    name: 'schedule',
    resolvers: Object.values(ScheduleHandlers),
};
