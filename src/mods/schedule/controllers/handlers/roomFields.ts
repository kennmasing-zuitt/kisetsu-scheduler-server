import { FieldResolver, ID, Resolver, Root } from 'type-graphql';
import type { Room } from '../../db/_schedule.types.js';
import { RoomObject } from '../../dto/room.dto.js';

/** Computed fields of the `Room` type. */
@Resolver(() => RoomObject)
export class RoomFieldsHandler {
    // Impl functions return Mongoose documents or .lean() objects, which carry `_id`
    @FieldResolver(() => ID)
    id(@Root() doc: Room): string {
        return String(doc._id);
    }
}
