import { SalesReportHandler } from './handlers/salesReport.js';

/**
 * Domain Namespace Pattern: every GraphQL handler (controller) of the Reports domain under one
 * name. The module root registers `Object.values(ReportsHandlers)` with the schema.
 */
export const ReportsHandlers = {
    SalesReportHandler,
} as const;
