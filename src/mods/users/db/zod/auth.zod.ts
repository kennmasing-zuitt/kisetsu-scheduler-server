import { z } from 'zod';

const Password = z.string().min(8).max(72);
const CurrentPassword = z.string().min(1);

export const RegisterInput = z.object({
    name: z.string().trim().min(1),
    email: z.string().trim().toLowerCase().pipe(z.email()),
    password: Password,
});

export const LoginInput = z.object({
    email: RegisterInput.shape.email,
    password: CurrentPassword,
});

export const UpdateUserInput = RegisterInput.omit({ password: true }).partial();

export const ChangePasswordInput = z
    .object({
        currentPassword: CurrentPassword,
        newPassword: Password,
    })
    .refine((d) => d.currentPassword !== d.newPassword, {
        message: 'New password must differ from the current one',
        path: ['newPassword'],
    });

export type RegisterInput = z.infer<typeof RegisterInput>;
