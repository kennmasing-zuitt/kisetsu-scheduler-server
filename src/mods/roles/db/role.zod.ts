import { z } from 'zod';
import { Permission, RoleKind } from './_roles.enum.js';

export const RoleKey = z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z][a-z0-9-]{1,39}$/, 'Use 2-40 lowercase letters, digits or dashes');

const Perms = z.array(z.enum(Permission)).transform((p) => [...new Set(p)]);

export const CreateRoleInput = z.object({
    key: RoleKey,
    name: z.string().trim().min(1).max(60),
    description: z.string().trim().max(300).optional(),
    kind: z.enum(RoleKind),
    perms: Perms,
});

export const UpdateRoleInput = z
    .object({
        name: z.string().trim().min(1).max(60).optional(),
        description: z.string().trim().max(300).optional(),
        perms: Perms.optional(),
    })
    .refine((d) => Object.values(d).some((v) => v !== undefined), {
        message: 'Provide at least one field to update',
    });

export type CreateRoleInput = z.infer<typeof CreateRoleInput>;
export type UpdateRoleInput = z.infer<typeof UpdateRoleInput>;
