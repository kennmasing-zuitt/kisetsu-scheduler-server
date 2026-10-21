import { FieldResolver, ID, Resolver, Root } from 'type-graphql';
import type { ClientWithStats } from '../../db/_schedule.types.js';
import { ClientObject } from '../../dto/client.dto.js';
import * as ScheduleImpl from '../../service/index.js';

/** Computed fields of the `Client` type (impl functions return clients with `stats`). */
@Resolver(() => ClientObject)
export class ClientFieldsHandler {
    @FieldResolver(() => ID)
    id(@Root() doc: ClientWithStats): string {
        return String(doc._id);
    }

    @FieldResolver(() => String)
    fullName(@Root() doc: ClientWithStats): string {
        return ScheduleImpl.clientFullName(doc);
    }
}
