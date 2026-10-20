import { Arg, Authorized, Mutation, Resolver } from 'type-graphql';
import { CurrentUser } from '../../../../core/graphql/auth.js';
import type { AuthUser } from '../../../../shared/auth/auth.types.js';
import { Permission } from '../../../roles/index.js';
import { parseInput } from '../../../../shared/validation.js';
import type { BookingDocument } from '../../db/_schedule.types.js';
import { CreateBookingInput } from '../../db/booking.zod.js';
import { BookingObject, CreateBookingInputType } from '../../dto/booking.dto.js';
import * as ScheduleImpl from '../../service/index.js';

@Resolver()
export class CreateBookingHandler {
    @Authorized(Permission.createBooking)
    @Mutation(() => BookingObject, {
        description:
            'Books a therapist and a room. Errors: VALIDATION_ERROR (times, opening hours), ' +
            'NOT_FOUND (therapist/room), THERAPIST_UNAVAILABLE, THERAPIST_DOUBLE_BOOKED, ROOM_TAKEN',
    })
    async createBooking(
        @CurrentUser() user: AuthUser,
        @Arg('input', () => CreateBookingInputType) input: CreateBookingInputType,
    ): Promise<BookingDocument> {
        return ScheduleImpl.createBooking({
            ...parseInput(CreateBookingInput, input),
            createdBy: user.id,
        });
    }
}
