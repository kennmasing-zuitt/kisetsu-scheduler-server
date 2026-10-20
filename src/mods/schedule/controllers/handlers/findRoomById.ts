import { Arg, Authorized, ID, Query, Resolver } from 'type-graphql';
import { parseInput } from '../../../../shared/validation.js';
import type { Room } from '../../db/_schedule.types.js';
import { RoomIdArgs } from '../../db/room.zod.js';
import { RoomObject } from '../../dto/room.dto.js';
import * as ScheduleImpl from '../../service/index.js';

@Resolver()
export class FindRoomByIdHandler {
    @Authorized()
    @Query(() => RoomObject, {
        nullable: true,
        description: "A single room, or null if it doesn't exist",
    })
    async room(@Arg('id', () => ID) id: string): Promise<Room | null> {
        return ScheduleImpl.findRoomById(parseInput(RoomIdArgs, { id }).id);
    }
}
