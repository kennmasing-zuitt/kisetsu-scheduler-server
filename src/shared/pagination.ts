import { z } from 'zod';

export type Paginated<T> = {
    data: T[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
};

// GraphQL sends `null` for explicitly-null args; treat it (and '') like "not provided"
const emptyToUndefined = (v: unknown) => (v === '' || v === null ? undefined : v);

export const PaginationSchema = z.object({
    page: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).default(1)),
    limit: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(100).default(20)),
});

export type Pagination = z.infer<typeof PaginationSchema>;
