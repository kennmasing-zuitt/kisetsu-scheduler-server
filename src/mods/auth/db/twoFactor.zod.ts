import { z } from 'zod';

/** An authenticator code ("123 456") or a recovery code ("k7dm-3xq9"). */
export const TwoFactorCode = z.string().trim().min(6).max(20);
export const TwoFactorPassword = z.string().min(1);
