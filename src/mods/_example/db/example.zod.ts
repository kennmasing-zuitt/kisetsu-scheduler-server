import { z } from 'zod';
import { ObjectIdSchema } from '../../../shared/validation.js';

export const CreateExampleInput = z.object({
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
});

export const UpdateExampleInput = CreateExampleInput.partial().refine(
    (d) => d.firstName !== undefined || d.lastName !== undefined,
    { message: 'Provide at least one field to update' },
);

export const ExampleIdArgs = z.object({ id: ObjectIdSchema });

export type CreateExampleInput = z.infer<typeof CreateExampleInput>;
export type UpdateExampleInput = z.infer<typeof UpdateExampleInput>;
