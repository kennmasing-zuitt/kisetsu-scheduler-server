import { Arg, Authorized, ID, Mutation, Resolver } from 'type-graphql';
import { Permission } from '../../../roles/index.js';
import { parseInput } from '../../../../shared/validation.js';
import type { Booking } from '../../db/_schedule.types.js';
import { BookingIdArgs, UpdateBookingInput } from '../../db/booking.zod.js';
import { BookingObject, UpdateBookingInputType } from '../../dto/booking.dto.js';
import * as ScheduleImpl from '../../service/index.js';

@Resolver()
export class UpdateBookingHandler {
    @Authorized(Permission.updateBooking)
    @Mutation(() => BookingObject, {
        description: 'Edit, move or reassign a booking. Same errors as createBooking',
    })
    async updateBooking(
        @Arg('id', () => ID) id: string,
        @Arg('input', () => UpdateBookingInputType) input: UpdateBookingInputType,
    ): Promise<Booking> {
        const { id: _id } = parseInput(BookingIdArgs, { id });
        const fields = parseInput(UpdateBookingInput, input);
        return ScheduleImpl.updateBooking({ _id, ...fields });
    }
}
