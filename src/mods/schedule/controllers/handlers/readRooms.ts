import { Authorized, Query, Resolver } from 'type-graphql';
import type { Room } from '../../db/_schedule.types.js';
import { RoomObject } from '../../dto/room.dto.js';
import * as ScheduleImpl from '../../service/index.js';

@Resolver()
export class ReadRoomsHandler {
    @Authorized()
    @Query(() => [RoomObject], { description: 'Every room, sorted by name' })
    async rooms(): Promise<Room[]> {
        return ScheduleImpl.readRooms();
    }
}
