import type { AppModule } from '../../shared/shared.types.js';
import { AuditHandlers } from './controllers/index.js';

// Module root: the only file other modules should import from.
export * as AuditOperations from './db/repository/index.js';
export * as AuditImpl from './service/index.js';
export { AuditHandlers };
export { AuditAction } from './db/_audit.enum.js';
export { AuditLogModel } from './db/audit.model.js';
export * from './dto/audit.dto.js';
export type * from './db/_audit.types.js';

export const auditModule: AppModule = {
    name: 'audit',
    resolvers: Object.values(AuditHandlers),
};
