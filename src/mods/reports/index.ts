import type { AppModule } from '../../shared/shared.types.js';
import { ReportsHandlers } from './controllers/index.js';

/**
 * Module root: the only file other modules should import from.
 * Sales reports over the schedule's bookings. Owns no collection: it reads bookings, therapists
 * and services through the schedule module and prices each booking at the price that prevailed
 * on its date. Same layout as src/mods/_example.
 */
export * as ReportsOperations from './db/repository/index.js';
export * as ReportsImpl from './service/index.js';
export { ReportsHandlers };
export { REPORT_CURRENCY, ReportPeriod, UnpricedReason } from './db/_reports.enum.js';
export * from './dto/report.dto.js';
export type * from './db/_reports.types.js';

export const reportsModule: AppModule = {
    name: 'reports',
    resolvers: Object.values(ReportsHandlers),
};
