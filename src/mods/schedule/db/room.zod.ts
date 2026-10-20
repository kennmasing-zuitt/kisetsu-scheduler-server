import { z } from 'zod';
import { ObjectIdSchema } from '../../../shared/validation.js';

export const CreateRoomInput = z.object({
    name: z.string().trim().min(1).max(100),
    color: z
        .string()
        .trim()
        .regex(/^#[0-9a-fA-F]{6}$/, { message: 'Use a hex color like #534AB7' })
        .transform((c) => c.toUpperCase()),
});

export const UpdateRoomInput = CreateRoomInput.partial().refine(
    (d) => d.name !== undefined || d.color !== undefined,
    { message: 'Provide at least one field to update' },
);

export const RoomIdArgs = z.object({ id: ObjectIdSchema });

export type CreateRoomInput = z.infer<typeof CreateRoomInput>;
export type UpdateRoomInput = z.infer<typeof UpdateRoomInput>;
