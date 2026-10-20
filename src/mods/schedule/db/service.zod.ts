import { z } from 'zod';
import { ObjectIdSchema } from '../../../shared/validation.js';
import { DateKey, Weekday } from './therapist.zod.js';

// GraphQL sends null for fields left out of a nullable input; treat both as "not set"
const nullish = (v: unknown) => (v === undefined ? null : v);

export const ServicePriceInput = z
    .object({
        durationMin: z.preprocess(nullish, z.number().int().min(10).max(600).nullable()),
        days: z.preprocess(
            (v) => v ?? [],
            z
                .array(Weekday)
                .max(7)
                .transform((days) => [...new Set(days)].sort((a, b) => a - b)),
        ),
        amount: z
            .number()
            .positive()
            .max(1_000_000)
            .refine((n) => Math.round(n * 100) === n * 100, {
                message: 'At most 2 decimal places',
            }),
        validFrom: DateKey,
        validTo: z.preprocess(nullish, DateKey.nullable()),
    })
    .refine((p) => p.validTo === null || p.validTo >= p.validFrom, {
        message: 'validTo must be on or after validFrom',
        path: ['validTo'],
    })
    // Every weekday ticked is the same as "every day": store it as []
    .transform((p) => (p.days.length === 7 ? { ...p, days: [] } : p));

type PriceRuleInput = z.infer<typeof ServicePriceInput>;

const END_OF_TIME = '9999-12-31';

/** True when one booking could match both rules (dates, weekdays and lengths all overlap). */
export function priceRulesOverlap(a: PriceRuleInput, b: PriceRuleInput): boolean {
    const dates =
        a.validFrom <= (b.validTo ?? END_OF_TIME) && b.validFrom <= (a.validTo ?? END_OF_TIME);
    const days = !a.days.length || !b.days.length || a.days.some((d) => b.days.includes(d));
    const lengths =
        a.durationMin === null || b.durationMin === null || a.durationMin === b.durationMin;
    return dates && days && lengths;
}

/** Position of a rule's first day in a Monday-first week (Sunday last); every day = 0. */
const firstWeekday = (days: number[]) =>
    days.length ? Math.min(...days.map((d) => (d === 0 ? 7 : d))) : 0;

/** A service's whole price list: rules may not overlap, so every booking has one price. */
const PriceList = z
    .array(ServicePriceInput)
    .max(200)
    .superRefine((rules, ctx) => {
        rules.forEach((a, i) =>
            rules.slice(i + 1).forEach((b, k) => {
                const j = i + 1 + k;
                if (priceRulesOverlap(a, b)) {
                    ctx.addIssue({
                        code: 'custom',
                        path: [j],
                        message:
                            `Price ${j + 1} overlaps price ${i + 1}: same days, length and ` +
                            'period. End the older one (validTo) the day before the new one starts.',
                    });
                }
            }),
        );
    })
    // Stored in a stable order: by length, then first weekday (Monday-first week, so Mon–Thu
    // comes before Fri–Sun), then period
    .transform((rules) =>
        [...rules].sort(
            (a, b) =>
                (a.durationMin ?? 0) - (b.durationMin ?? 0) ||
                firstWeekday(a.days) - firstWeekday(b.days) ||
                a.validFrom.localeCompare(b.validFrom),
        ),
    );

const fields = {
    name: z.string().trim().min(1).max(100),
    description: z.preprocess((v) => v ?? '', z.string().trim().max(500)),
    isActive: z.preprocess((v) => v ?? true, z.boolean()),
    prices: PriceList,
};

export const CreateServiceInput = z.object(fields);

export const UpdateServiceInput = z
    .object({
        name: fields.name.optional(),
        description: z.string().trim().max(500).optional(),
        isActive: z.boolean().optional(),
        prices: PriceList.optional(),
    })
    .refine((d) => Object.values(d).some((v) => v !== undefined), {
        message: 'Provide at least one field to update',
    });

export const ServiceIdArgs = z.object({ id: ObjectIdSchema });

export type CreateServiceInput = z.infer<typeof CreateServiceInput>;
export type UpdateServiceInput = z.infer<typeof UpdateServiceInput>;
