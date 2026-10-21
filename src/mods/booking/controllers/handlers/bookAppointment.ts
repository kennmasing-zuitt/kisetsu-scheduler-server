import { Arg, Ctx, Mutation, Resolver, UseMiddleware } from 'type-graphql';
import type { GraphQLContext } from '../../../../core/graphql/context.js';
import { parseInput } from '../../../../shared/validation.js';
import type { AppointmentConfirmation } from '../../db/_booking.types.js';
import { AppointmentInput } from '../../db/booking.zod.js';
import { AppointmentConfirmationObject, AppointmentInputType } from '../../dto/booking.dto.js';
import * as BookingImpl from '../../service/index.js';
import { ClientOnly } from '../clientGuard.js';

@Resolver()
export class BookAppointmentHandler {
    @UseMiddleware(ClientOnly)
    @Mutation(() => AppointmentConfirmationObject, {
        description:
            'Books for the signed-in client. Errors: SLOT_TAKEN, OUTSIDE_BOOKING_WINDOW, ' +
            'TOO_MANY_BOOKINGS, VALIDATION_ERROR',
    })
    async bookAppointment(
        @Ctx() ctx: GraphQLContext,
        @Arg('input', () => AppointmentInputType) input: AppointmentInputType,
    ): Promise<AppointmentConfirmation> {
        return BookingImpl.bookAppointment(
            ctx.bookingClient!.id,
            parseInput(AppointmentInput, input),
        );
    }
}
