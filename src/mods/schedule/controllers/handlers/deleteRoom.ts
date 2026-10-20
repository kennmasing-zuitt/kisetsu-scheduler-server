import { Arg, Authorized, ID, Mutation, Resolver } from 'type-graphql';
import { Permission } from '../../../roles/index.js';
import { parseInput } from '../../../../shared/validation.js';
import { RoomIdArgs } from '../../db/room.zod.js';
import * as ScheduleImpl from '../../service/index.js';

@Resolver()
export class DeleteRoomHandler {
    @Authorized(Permission.deleteRoom)
    @Mutation(() => Boolean, {
        description:
            'Returns true when deleted. Errors: NOT_FOUND, ROOM_HAS_BOOKINGS (the room still has upcoming bookings)',
    })
    async deleteRoom(@Arg('id', () => ID) id: string): Promise<boolean> {
        return ScheduleImpl.deleteRoom(parseInput(RoomIdArgs, { id }).id);
    }
}
