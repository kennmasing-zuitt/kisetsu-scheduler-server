import { FieldResolver, ID, Resolver, Root } from 'type-graphql';
import type { Therapist } from '../../db/_schedule.types.js';
import { TherapistObject } from '../../dto/therapist.dto.js';

/** Computed fields of the `Therapist` type. */
@Resolver(() => TherapistObject)
export class TherapistFieldsHandler {
    // Impl functions return Mongoose documents or .lean() objects, which carry `_id`
    @FieldResolver(() => ID)
    id(@Root() doc: Therapist): string {
        return String(doc._id);
    }
}
