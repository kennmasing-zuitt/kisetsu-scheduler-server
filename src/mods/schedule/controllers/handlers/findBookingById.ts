import { Arg, Authorized, ID, Query, Resolver } from 'type-graphql';
import { parseInput } from '../../../../shared/validation.js';
import type { Booking } from '../../db/_schedule.types.js';
import { BookingIdArgs } from '../../db/booking.zod.js';
import { BookingObject } from '../../dto/booking.dto.js';
import * as ScheduleImpl from '../../service/index.js';

@Resolver()
export class FindBookingByIdHandler {
    @Authorized()
    @Query(() => BookingObject, {
        nullable: true,
        description: "A single booking, or null if it doesn't exist",
    })
    async booking(@Arg('id', () => ID) id: string): Promise<Booking | null> {
        return ScheduleImpl.findBookingById(parseInput(BookingIdArgs, { id }).id);
    }
}
