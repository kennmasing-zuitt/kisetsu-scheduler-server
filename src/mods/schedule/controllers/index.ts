import { BookingFieldsHandler } from './handlers/bookingFields.js';
import { ClientFieldsHandler } from './handlers/clientFields.js';
import { CreateBookingHandler } from './handlers/createBooking.js';
import { CreatePromoHandler } from './handlers/createPromo.js';
import { CreateRoomHandler } from './handlers/createRoom.js';
import { CreateServiceHandler } from './handlers/createService.js';
import { CreateTherapistHandler } from './handlers/createTherapist.js';
import { DeleteBookingHandler } from './handlers/deleteBooking.js';
import { DeletePromoHandler } from './handlers/deletePromo.js';
import { DeleteRoomHandler } from './handlers/deleteRoom.js';
import { DeleteServiceHandler } from './handlers/deleteService.js';
import { DeleteTherapistHandler } from './handlers/deleteTherapist.js';
import { FindBookingByIdHandler } from './handlers/findBookingById.js';
import { FindClientHandler } from './handlers/findClient.js';
import { FindRoomByIdHandler } from './handlers/findRoomById.js';
import { FindServiceByIdHandler } from './handlers/findServiceById.js';
import { FindTherapistByIdHandler } from './handlers/findTherapistById.js';
import { PromoFieldsHandler } from './handlers/promoFields.js';
import { ReadBookingsHandler } from './handlers/readBookings.js';
import { ReadClientBookingsHandler } from './handlers/readClientBookings.js';
import { ReadClientsHandler } from './handlers/readClients.js';
import { ReadPromosHandler } from './handlers/readPromos.js';
import { ReadRoomsHandler } from './handlers/readRooms.js';
import { ReadServicesHandler } from './handlers/readServices.js';
import { ReadTherapistsHandler } from './handlers/readTherapists.js';
import { RoomFieldsHandler } from './handlers/roomFields.js';
import { ServiceFieldsHandler, ServicePriceFieldsHandler } from './handlers/serviceFields.js';
import { TherapistFieldsHandler } from './handlers/therapistFields.js';
import { UpdateBookingHandler } from './handlers/updateBooking.js';
import { UpdateClientHandler } from './handlers/updateClient.js';
import { UpdatePromoHandler } from './handlers/updatePromo.js';
import { UpdateRoomHandler } from './handlers/updateRoom.js';
import { UpdateServiceHandler } from './handlers/updateService.js';
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
    // Services
    CreateServiceHandler,
    ReadServicesHandler,
    FindServiceByIdHandler,
    UpdateServiceHandler,
    DeleteServiceHandler,
    ServiceFieldsHandler,
    ServicePriceFieldsHandler,
    // Clients
    ReadClientsHandler,
    FindClientHandler,
    ReadClientBookingsHandler,
    UpdateClientHandler,
    ClientFieldsHandler,
    // Promos
    ReadPromosHandler,
    CreatePromoHandler,
    UpdatePromoHandler,
    DeletePromoHandler,
    PromoFieldsHandler,
    // Bookings
    CreateBookingHandler,
    ReadBookingsHandler,
    FindBookingByIdHandler,
    UpdateBookingHandler,
    DeleteBookingHandler,
    BookingFieldsHandler,
} as const;
