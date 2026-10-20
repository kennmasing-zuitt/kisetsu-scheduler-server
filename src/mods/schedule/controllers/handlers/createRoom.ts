import { Arg, Authorized, Mutation, Resolver } from 'type-graphql';
import { Permission } from '../../../roles/index.js';
import { parseInput } from '../../../../shared/validation.js';
import type { RoomDocument } from '../../db/_schedule.types.js';
import { CreateRoomInput } from '../../db/room.zod.js';
import { CreateRoomInputType, RoomObject } from '../../dto/room.dto.js';
import * as ScheduleImpl from '../../service/index.js';

@Resolver()
export class CreateRoomHandler {
    @Authorized(Permission.createRoom)
    @Mutation(() => RoomObject)
    async createRoom(
        @Arg('input', () => CreateRoomInputType) input: CreateRoomInputType,
    ): Promise<RoomDocument> {
        return ScheduleImpl.createRoom(parseInput(CreateRoomInput, input));
    }
}
