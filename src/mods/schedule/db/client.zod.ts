import { z } from 'zod';
import { MOBILE_HINT, normalizeMobile } from '../../../shared/mobile.js';
import { ObjectIdSchema } from '../../../shared/validation.js';

/** Any accepted mobile format -> "+639171234567" (see shared/mobile.ts) */
export const MobileNumber = z.string().transform((value, ctx) => {
    const mobile = normalizeMobile(value);
    if (!mobile) {
        ctx.addIssue({ code: 'custom', message: MOBILE_HINT });
        return z.NEVER;
    }
    return mobile;
});

const blankToUndefined = (v: unknown) =>
    v === null || (typeof v === 'string' && v.trim() === '') ? undefined : v;

export const FirstName = z.string().trim().min(1).max(100);
export const LastName = z.preprocess((v) => v ?? '', z.string().trim().max(100));

export const UpdateClientInput = z
    .object({
        mobile: z.preprocess(blankToUndefined, MobileNumber.optional()),
        firstName: z.preprocess(blankToUndefined, FirstName.optional()),
        lastName: z.string().trim().max(100).optional(),
        notes: z.string().trim().max(1000).optional(),
    })
    .refine((d) => Object.values(d).some((v) => v !== undefined), {
        message: 'Provide at least one field to update',
    });

export const ClientIdArgs = z.object({ id: ObjectIdSchema });

const emptyToUndefined = (v: unknown) => (v === '' || v === null ? undefined : v);

export const ClientSearchArgs = z.object({
    search: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
    page: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).default(1)),
    limit: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(100).default(20)),
});

export const ClientBookingsArgs = z.object({
    clientId: ObjectIdSchema,
    limit: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(100).default(20)),
});

export type UpdateClientInput = z.infer<typeof UpdateClientInput>;
export type ClientSearchArgs = z.infer<typeof ClientSearchArgs>;
