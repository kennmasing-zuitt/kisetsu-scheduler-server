import { AuditLogFieldsHandler } from './handlers/auditLogFields.js';
import { ListAuditLogsHandler } from './handlers/listAuditLogs.js';

/** Domain Namespace Pattern: every GraphQL handler (controller) of the Audit domain. */
export const AuditHandlers = {
    ListAuditLogsHandler,
    AuditLogFieldsHandler,
} as const;
