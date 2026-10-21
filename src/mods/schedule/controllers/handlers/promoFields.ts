import { FieldResolver, ID, Resolver, Root } from 'type-graphql';
import type { PromoWithUsage } from '../../db/_schedule.types.js';
import { PromoObject } from '../../dto/promo.dto.js';

/** Computed fields of the `Promo` type (impl functions return promos with `timesUsed`). */
@Resolver(() => PromoObject)
export class PromoFieldsHandler {
    @FieldResolver(() => ID)
    id(@Root() doc: PromoWithUsage): string {
        return String(doc._id);
    }

    @FieldResolver(() => [ID])
    serviceIds(@Root() doc: PromoWithUsage): string[] {
        return doc.serviceIds.map(String);
    }

    @FieldResolver(() => Boolean)
    isLocked(@Root() doc: PromoWithUsage): boolean {
        return doc.timesUsed > 0;
    }
}
