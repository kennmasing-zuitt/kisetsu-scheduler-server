import { Arg, Authorized, ID, Mutation, Resolver } from 'type-graphql';
import { Permission } from '../../../roles/index.js';
import { parseInput } from '../../../../shared/validation.js';
import { RoomIdArgs } from '../../db/room.zod.js';
import * as ScheduleImpl from '../../service/index.js';

@Resolver()
export class DeleteRoomHandler {
    @Authorized(Permission.deleteRoom)
    @Mutation(() => Boolean, {
        description: 'Returns true when deleted; NOT_FOUND error otherwise',
    })
    async deleteRoom(@Arg('id', () => ID) id: string): Promise<boolean> {
        return ScheduleImpl.deleteRoom(parseInput(RoomIdArgs, { id }).id);
    }
}
