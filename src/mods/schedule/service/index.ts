// Standard Barrel Pattern: the isolated wrapper for service/. Re-exports every
// business-logic function (impl/*) so callers never import the inner files directly:
//   import * as ScheduleImpl from '<path>/service/index.js';
export * from './impl/assertBookingAllowed.js';
export * from './impl/createBooking.js';
export * from './impl/createRoom.js';
export * from './impl/createService.js';
export * from './impl/createTherapist.js';
export * from './impl/deleteBooking.js';
export * from './impl/deleteRoom.js';
export * from './impl/deleteService.js';
export * from './impl/deleteTherapist.js';
export * from './impl/findBookingById.js';
export * from './impl/findRoomById.js';
export * from './impl/findServiceById.js';
export * from './impl/findServicePrice.js';
export * from './impl/findTherapistById.js';
export * from './impl/readBookings.js';
export * from './impl/readRooms.js';
export * from './impl/readServices.js';
export * from './impl/readTherapists.js';
export * from './impl/updateBooking.js';
export * from './impl/updateRoom.js';
export * from './impl/updateService.js';
export * from './impl/updateTherapist.js';
