/** "Juan Dela Cruz", or just the first name */
export const clientFullName = (c: { firstName: string; lastName?: string | null }): string =>
    [c.firstName, c.lastName].filter(Boolean).join(' ');
