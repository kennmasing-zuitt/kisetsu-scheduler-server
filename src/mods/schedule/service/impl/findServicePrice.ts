import type { PriceQuery, ServicePriceRule } from '../../db/_schedule.types.js';

/** True when the rule applies to a booking on that local date and weekday (any length). */
export const priceRuleAppliesOn = (
    rule: ServicePriceRule,
    { dateKey, weekday }: Pick<PriceQuery, 'dateKey' | 'weekday'>,
): boolean =>
    rule.validFrom <= dateKey &&
    (!rule.validTo || dateKey <= rule.validTo) &&
    (!rule.days?.length || rule.days.includes(weekday));

/**
 * The prevailing price rule for a booking: the one whose period contains the booking's local
 * date, whose days include its weekday and whose length matches (or is "any length").
 * Rules never overlap, so there is at most one. Undefined when the service has no price then.
 */
export function findServicePrice<T extends ServicePriceRule>(
    prices: readonly T[],
    query: PriceQuery,
): T | undefined {
    return prices.find(
        (rule) =>
            priceRuleAppliesOn(rule, query) &&
            (rule.durationMin == null || rule.durationMin === query.durationMin),
    );
}

/** Lengths with a price on that date ("any length" rules are left out), shortest first. */
export const pricedDurationsOn = (
    prices: readonly ServicePriceRule[],
    day: Pick<PriceQuery, 'dateKey' | 'weekday'>,
): number[] =>
    [
        ...new Set(
            prices
                .filter((rule) => rule.durationMin != null && priceRuleAppliesOn(rule, day))
                .map((rule) => rule.durationMin as number),
        ),
    ].sort((a, b) => a - b);
