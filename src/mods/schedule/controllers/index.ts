import { BookingFieldsHandler } from './handlers/bookingFields.js';
import { CreateBookingHandler } from './handlers/createBooking.js';
import { CreateRoomHandler } from './handlers/createRoom.js';
import { CreateTherapistHandler } from './handlers/createTherapist.js';
import { DeleteBookingHandler } from './handlers/deleteBooking.js';
import { DeleteRoomHandler } from './handlers/deleteRoom.js';
import { DeleteTherapistHandler } from './handlers/deleteTherapist.js';
import { FindBookingByIdHandler } from './handlers/findBookingById.js';
import { FindRoomByIdHandler } from './handlers/findRoomById.js';
import { FindTherapistByIdHandler } from './handlers/findTherapistById.js';
import { ReadBookingsHandler } from './handlers/readBookings.js';
import { ReadRoomsHandler } from './handlers/readRooms.js';
import { ReadTherapistsHandler } from './handlers/readTherapists.js';
import { RoomFieldsHandler } from './handlers/roomFields.js';
import { TherapistFieldsHandler } from './handlers/therapistFields.js';
import { UpdateBookingHandler } from './handlers/updateBooking.js';
import { UpdateRoomHandler } from './handlers/updateRoom.js';
import { UpdateTherapistHandler } from './handlers/updateTherapist.js';

/**
 * Domain Namespace Pattern: every GraphQL handler (controller) of the Schedule domain under one
 * name. The module root registers `Object.values(ScheduleHandlers)` with the schema, so adding a
 * handler here is all it takes to expose it.
 */
export const ScheduleHandlers = {
    // Therapists
    CreateTherapistHandler,
    ReadTherapistsHandler,
    FindTherapistByIdHandler,
    UpdateTherapistHandler,
    DeleteTherapistHandler,
    TherapistFieldsHandler,
    // Rooms
    CreateRoomHandler,
    ReadRoomsHandler,
    FindRoomByIdHandler,
    UpdateRoomHandler,
    DeleteRoomHandler,
    RoomFieldsHandler,
    // Bookings
    CreateBookingHandler,
    ReadBookingsHandler,
    FindBookingByIdHandler,
    UpdateBookingHandler,
    DeleteBookingHandler,
    BookingFieldsHandler,
} as const;
