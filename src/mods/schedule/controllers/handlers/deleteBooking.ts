import { Arg, Authorized, ID, Mutation, Resolver } from 'type-graphql';
import { CurrentUser } from '../../../../core/graphql/auth.js';
import type { AuthUser } from '../../../../shared/auth/auth.types.js';
import { parseInput } from '../../../../shared/validation.js';
import { Permission } from '../../../roles/index.js';
import { BookingIdArgs } from '../../db/booking.zod.js';
import * as ScheduleImpl from '../../service/index.js';

@Resolver()
export class DeleteBookingHandler {
    @Authorized(Permission.deleteBooking)
    @Mutation(() => Boolean, {
        description:
            'Cancels a booking: it is kept (status cancelled) but frees the therapist and room. ' +
            'With notifyClient the client gets a text. NOT_FOUND, or BOOKING_CANCELLED if it already was.',
    })
    async deleteBooking(
        @CurrentUser() user: AuthUser,
        @Arg('id', () => ID) id: string,
        @Arg('notifyClient', () => Boolean, { defaultValue: false }) notifyClient: boolean,
    ): Promise<boolean> {
        await ScheduleImpl.cancelBookingByStaff(
            parseInput(BookingIdArgs, { id }).id,
            user.id,
            notifyClient,
        );
        return true;
    }
}
