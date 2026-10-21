import { z } from 'zod';
import { MOBILE_HINT, normalizeMobile } from '../../../shared/mobile.js';
import { ObjectIdSchema } from '../../../shared/validation.js';
import { DateKey } from '../../schedule/index.js';

export const Mobile = z.string().transform((v, ctx) => {
    const mobile = normalizeMobile(v);
    if (!mobile) {
        ctx.addIssue({ code: 'custom', message: MOBILE_HINT });
        return z.NEVER;
    }
    return mobile;
});

const Code = z.string().trim().min(4).max(12);
const Name = z.string().trim().max(100);

export const RequestSetupCodeInput = z.object({
    mobile: Mobile,
    turnstileToken: z.string().min(1).max(2048),
});

export const VerifySetupCodeInput = z.object({ mobile: Mobile, code: Code });

export const StartAppSetupInput = z.object({
    setupToken: z.string().min(1),
    firstName: Name.optional().transform((v) => v || undefined),
    lastName: Name.optional().transform((v) => v || undefined),
});

export const ConfirmAppSetupInput = z.object({ setupToken: z.string().min(1), code: Code });

export const ClientLoginInput = z.object({ mobile: Mobile, code: Code });

export const ServicesForDateArgs = z.object({ date: DateKey });

export const SlotQueryInput = z.object({
    date: DateKey,
    serviceId: ObjectIdSchema,
    durationMin: z.number().int().min(15).max(600),
    therapistId: ObjectIdSchema.optional(),
});

export const AppointmentInput = z.object({
    serviceId: ObjectIdSchema,
    durationMin: z.number().int().min(15).max(600),
    start: z.date(),
    // GraphQL sends null for "any therapist"
    therapistId: ObjectIdSchema.nullish().transform((v) => v ?? undefined),
});
