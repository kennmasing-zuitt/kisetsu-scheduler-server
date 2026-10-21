import { AppSetupHandler } from './handlers/appSetup.js';
import { BookAppointmentHandler } from './handlers/bookAppointment.js';
import { BookingOptionsHandler } from './handlers/bookingOptions.js';
import { ClientLoginHandler } from './handlers/clientLogin.js';

/** Every handler of the PUBLIC booking endpoint (/booking/graphql). Not in the staff schema. */
export const BookingHandlers = {
    AppSetupHandler,
    ClientLoginHandler,
    BookingOptionsHandler,
    BookAppointmentHandler,
} as const;
