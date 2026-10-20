import { z } from 'zod';
import { DateKey } from '../../schedule/index.js';
import { ReportPeriod } from './_reports.enum.js';

export const SalesReportArgs = z.object({
    period: z.enum(ReportPeriod),
    date: DateKey,
    includeUpcoming: z.preprocess((v) => v ?? false, z.boolean()),
});

export type SalesReportArgs = z.infer<typeof SalesReportArgs>;
