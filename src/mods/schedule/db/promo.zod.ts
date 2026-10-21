import { z } from 'zod';
import { ObjectIdSchema } from '../../../shared/validation.js';
import { DiscountType } from './_schedule.enum.js';
import { DateKey } from './therapist.zod.js';

const nullish = (v: unknown) => (v === undefined ? null : v);

export const PromoCode = z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9][A-Z0-9_-]{2,29}$/, {
        message: '3–30 letters, digits, - or _ (e.g. KISETSU10)',
    });

const Value = z
    .number()
    .positive()
    .max(1_000_000)
    .refine((n) => Math.round(n * 100) === n * 100, { message: 'At most 2 decimal places' });

const ServiceIds = z
    .array(ObjectIdSchema)
    .max(100)
    .transform((ids) => [...new Set(ids)]);

/** A percent discount is at most 100 */
const percentAtMost100 = (d: { discountType?: DiscountType; value?: number }) =>
    d.discountType !== DiscountType.percent || d.value === undefined || d.value <= 100;

const periodInOrder = (d: { validFrom?: string; validTo?: string | null }) =>
    !d.validFrom || !d.validTo || d.validTo >= d.validFrom;

export const CreatePromoInput = z
    .object({
        code: PromoCode,
        description: z.preprocess((v) => v ?? '', z.string().trim().max(300)),
        discountType: z.enum(DiscountType),
        value: Value,
        validFrom: DateKey,
        validTo: z.preprocess(nullish, DateKey.nullable()),
        serviceIds: z.preprocess((v) => v ?? [], ServiceIds),
        isActive: z.preprocess((v) => v ?? true, z.boolean()),
    })
    .refine(percentAtMost100, { message: 'A percent discount is at most 100', path: ['value'] })
    .refine(periodInOrder, { message: 'validTo must be on or after validFrom', path: ['validTo'] });

// For updates, null means "leave it" except validTo, where null clears the end date: the
// resolver passes validTo through only when the field was sent
export const UpdatePromoInput = z
    .object({
        code: PromoCode.optional(),
        description: z.string().trim().max(300).optional(),
        discountType: z.enum(DiscountType).optional(),
        value: Value.optional(),
        validFrom: DateKey.optional(),
        validTo: DateKey.nullable().optional(),
        serviceIds: ServiceIds.optional(),
        isActive: z.boolean().optional(),
    })
    .refine((d) => Object.values(d).some((v) => v !== undefined), {
        message: 'Provide at least one field to update',
    })
    .refine(percentAtMost100, { message: 'A percent discount is at most 100', path: ['value'] })
    .refine(periodInOrder, { message: 'validTo must be on or after validFrom', path: ['validTo'] });

export const PromoIdArgs = z.object({ id: ObjectIdSchema });
export const PromoCodeArgs = z.object({ code: PromoCode });

export type CreatePromoInput = z.infer<typeof CreatePromoInput>;
export type UpdatePromoInput = z.infer<typeof UpdatePromoInput>;
