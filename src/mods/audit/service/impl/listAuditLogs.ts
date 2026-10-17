import type { Paginated, Pagination } from '../../../../shared/pagination.js';
import type { AuditLog } from '../../db/_audit.types.js';
import * as AuditOperations from '../../db/repository/index.js';
import type { AuditLogFilter } from '../../db/repository/operations/findAuditLogs.js';

export const listAuditLogs = async (
    pagination: Pagination,
    filter?: AuditLogFilter,
): Promise<Paginated<AuditLog>> => AuditOperations.findAuditLogs(pagination, filter);
