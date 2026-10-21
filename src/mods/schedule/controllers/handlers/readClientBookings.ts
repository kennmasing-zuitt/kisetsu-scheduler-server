import { Args, Authorized, Query, Resolver } from 'type-graphql';
import { Permission } from '../../../roles/index.js';
import { parseInput } from '../../../../shared/validation.js';
import type { Booking } from '../../db/_schedule.types.js';
import { ClientBookingsArgs } from '../../db/client.zod.js';
import { BookingObject } from '../../dto/booking.dto.js';
import { ClientBookingsArgsType } from '../../dto/client.dto.js';
import * as ScheduleImpl from '../../service/index.js';

@Resolver()
export class ReadClientBookingsHandler {
    @Authorized(Permission.readClients)
    @Query(() => [BookingObject], { description: "A client's bookings, newest first" })
    async clientBookings(
        @Args(() => ClientBookingsArgsType) args: ClientBookingsArgsType,
    ): Promise<Booking[]> {
        const { clientId, limit } = parseInput(ClientBookingsArgs, args);
        return ScheduleImpl.readClientBookings(clientId, limit);
    }
}
