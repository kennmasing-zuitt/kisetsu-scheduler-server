import { Args, Authorized, Query, Resolver } from 'type-graphql';
import { parseInput } from '../../../../shared/validation.js';
import type { Booking } from '../../db/_schedule.types.js';
import { BookingRangeArgs } from '../../db/booking.zod.js';
import { BookingObject, BookingRangeArgsType } from '../../dto/booking.dto.js';
import * as ScheduleImpl from '../../service/index.js';

@Resolver()
export class ReadBookingsHandler {
    @Authorized()
    @Query(() => [BookingObject], {
        description: 'Bookings overlapping [from, to), earliest first (what a calendar view shows)',
    })
    async bookings(
        @Args(() => BookingRangeArgsType) args: BookingRangeArgsType,
    ): Promise<Booking[]> {
        return ScheduleImpl.readBookings(parseInput(BookingRangeArgs, args));
    }
}
