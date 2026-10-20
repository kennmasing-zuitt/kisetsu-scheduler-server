import { Arg, Authorized, ID, Mutation, Resolver } from 'type-graphql';
import { Permission } from '../../../roles/index.js';
import { parseInput } from '../../../../shared/validation.js';
import type { Room } from '../../db/_schedule.types.js';
import { RoomIdArgs, UpdateRoomInput } from '../../db/room.zod.js';
import { RoomObject, UpdateRoomInputType } from '../../dto/room.dto.js';
import * as ScheduleImpl from '../../service/index.js';

@Resolver()
export class UpdateRoomHandler {
    @Authorized(Permission.updateRoom)
    @Mutation(() => RoomObject)
    async updateRoom(
        @Arg('id', () => ID) id: string,
        @Arg('input', () => UpdateRoomInputType) input: UpdateRoomInputType,
    ): Promise<Room> {
        const { id: _id } = parseInput(RoomIdArgs, { id });
        const fields = parseInput(UpdateRoomInput, input);
        return ScheduleImpl.updateRoom({ _id, ...fields });
    }
}
