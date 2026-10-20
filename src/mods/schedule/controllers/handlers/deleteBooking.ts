import { Arg, Authorized, ID, Mutation, Resolver } from 'type-graphql';
import { Permission } from '../../../roles/index.js';
import { parseInput } from '../../../../shared/validation.js';
import { BookingIdArgs } from '../../db/booking.zod.js';
import * as ScheduleImpl from '../../service/index.js';

@Resolver()
export class DeleteBookingHandler {
    @Authorized(Permission.deleteBooking)
    @Mutation(() => Boolean, {
        description: 'Cancels a booking. Returns true when deleted; NOT_FOUND error otherwise',
    })
    async deleteBooking(@Arg('id', () => ID) id: string): Promise<boolean> {
        return ScheduleImpl.deleteBooking(parseInput(BookingIdArgs, { id }).id);
    }
}
