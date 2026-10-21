import { Arg, Ctx, ID, Int, Query, Resolver, UseMiddleware } from 'type-graphql';
import { env } from '../../../../core/config/env.js';
import type { GraphQLContext } from '../../../../core/graphql/context.js';
import { parseInput } from '../../../../shared/validation.js';
import type { PublicService, PublicTherapist, Slot } from '../../db/_booking.types.js';
import { ServicesForDateArgs, SlotQueryInput } from '../../db/booking.zod.js';
import {
    BookingWindowObject,
    PublicServiceObject,
    PublicTherapistObject,
    SlotObject,
} from '../../dto/booking.dto.js';
import * as BookingImpl from '../../service/index.js';
import { ClientOnly } from '../clientGuard.js';

@Resolver()
export class BookingOptionsHandler {
    @Query(() => BookingWindowObject, { description: 'Bookable days and the earliest start' })
    bookingWindow(): BookingWindowObject {
        return {
            ...BookingImpl.bookingWindow(),
            timeZone: env.SCHEDULE_TIMEZONE,
            phone: env.SPA_PHONE,
        };
    }

    @Query(() => [PublicServiceObject], { description: 'Services, lengths and prices on a date' })
    async bookingServices(@Arg('date', () => String) date: string): Promise<PublicService[]> {
        return BookingImpl.servicesForDate(parseInput(ServicesForDateArgs, { date }).date);
    }

    @Query(() => [PublicTherapistObject], { description: 'Therapists (first names)' })
    async bookingTherapists(): Promise<PublicTherapist[]> {
        return BookingImpl.publicTherapists();
    }

    @UseMiddleware(ClientOnly)
    @Query(() => [SlotObject], {
        description:
            'Free start times on a day (signed-in clients). Errors: OUTSIDE_BOOKING_WINDOW, VALIDATION_ERROR',
    })
    async availableSlots(
        @Ctx() _ctx: GraphQLContext,
        @Arg('date', () => String) date: string,
        @Arg('serviceId', () => ID) serviceId: string,
        @Arg('durationMin', () => Int) durationMin: number,
        @Arg('therapistId', () => ID, { nullable: true }) therapistId?: string | null,
    ): Promise<Slot[]> {
        const query = parseInput(SlotQueryInput, {
            date,
            serviceId,
            durationMin,
            therapistId: therapistId ?? undefined,
        });
        return BookingImpl.availableSlots(query);
    }
}
