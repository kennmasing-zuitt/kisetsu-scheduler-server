import { FieldResolver, ID, Resolver, Root } from 'type-graphql';
import type { Example } from '../../db/_example.types.js';
import { ExampleObject } from '../../dto/example.dto.js';

/** Computed fields of the `Example` type. */
@Resolver(() => ExampleObject)
export class ExampleFieldsHandler {
    // Impl functions return Mongoose documents or .lean() objects, which carry `_id`
    @FieldResolver(() => ID)
    id(@Root() doc: Example): string {
        return String(doc._id);
    }
}
