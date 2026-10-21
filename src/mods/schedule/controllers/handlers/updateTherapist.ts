import { Arg, Authorized, ID, Int, Mutation, Query, Resolver } from 'type-graphql';
import { CurrentUser } from '../../../../core/graphql/auth.js';
import type { AuthUser } from '../../../../shared/auth/auth.types.js';
import { parseInput } from '../../../../shared/validation.js';
import { Permission } from '../../../roles/index.js';
import type { Booking, Therapist } from '../../db/_schedule.types.js';
import {
    TherapistAvailabilityInput,
    TherapistIdArgs,
    UpdateTherapistInput,
} from '../../db/therapist.zod.js';
import { BookingObject } from '../../dto/booking.dto.js';
import { TherapistObject, UpdateTherapistInputType } from '../../dto/therapist.dto.js';
import * as ScheduleImpl from '../../service/index.js';

@Resolver()
export class UpdateTherapistHandler {
    @Authorized(Permission.updateTherapist)
    @Mutation(() => TherapistObject, {
        description:
            'Rename a therapist or replace their weekly days off / leave dates. Upcoming bookings ' +
            'on days they no longer work are cancelled and the clients are texted to rebook ' +
            '(preview them with therapistConflicts).',
    })
    async updateTherapist(
        @CurrentUser() user: AuthUser,
        @Arg('id', () => ID) id: string,
        @Arg('input', () => UpdateTherapistInputType) input: UpdateTherapistInputType,
    ): Promise<Therapist> {
        const { id: _id } = parseInput(TherapistIdArgs, { id });
        const fields = parseInput(UpdateTherapistInput, input);
        const { therapist } = await ScheduleImpl.updateTherapist({ _id, ...fields }, user.id);
        return therapist;
    }

    @Authorized(Permission.updateTherapist)
    @Query(() => [BookingObject], {
        description:
            'Upcoming bookings that would be cancelled if the therapist had these days off / ' +
            'leave dates (omitted lists keep the current ones). Ask before saving.',
    })
    async therapistConflicts(
        @Arg('id', () => ID) id: string,
        @Arg('offDays', () => [Int], { nullable: true }) offDays?: number[] | null,
        @Arg('leaveDates', () => [String], { nullable: true }) leaveDates?: string[] | null,
    ): Promise<Booking[]> {
        const { id: therapistId } = parseInput(TherapistIdArgs, { id });
        const fields = parseInput(TherapistAvailabilityInput, {
            ...(offDays ? { offDays } : {}),
            ...(leaveDates ? { leaveDates } : {}),
        });
        return ScheduleImpl.therapistConflicts(therapistId, fields);
    }
}
