import { FieldResolver, ID, Resolver, Root } from 'type-graphql';
import type { Service } from '../../db/_schedule.types.js';
import { ServiceObject, ServicePriceObject } from '../../dto/service.dto.js';

/** Computed fields of the `Service` type. */
@Resolver(() => ServiceObject)
export class ServiceFieldsHandler {
    // Impl functions return Mongoose documents or .lean() objects, which carry `_id`
    @FieldResolver(() => ID)
    id(@Root() doc: Service): string {
        return String(doc._id);
    }
}

type StoredPrice = Service['prices'][number];

/** Computed fields of the `ServicePrice` type (sub-documents also carry `_id`). */
@Resolver(() => ServicePriceObject)
export class ServicePriceFieldsHandler {
    @FieldResolver(() => ID)
    id(@Root() doc: StoredPrice): string {
        return String(doc._id);
    }
}
