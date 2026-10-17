import type { Paginated, Pagination } from '../../../../../shared/pagination.js';
import type { AuditAction } from '../../_audit.enum.js';
import type { AuditLog } from '../../_audit.types.js';
import { AuditLogModel } from '../../audit.model.js';

export interface AuditLogFilter {
    action?: AuditAction;
    actorId?: string;
    targetId?: string;
}

export const findAuditLogs = async (
    { page, limit }: Pagination,
    filter: AuditLogFilter = {},
): Promise<Paginated<AuditLog>> => {
    const query = Object.fromEntries(Object.entries(filter).filter(([, v]) => v !== undefined));
    const [docs, total] = await Promise.all([
        AuditLogModel.find(query)
            .sort({ createdAt: -1, _id: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean<AuditLog[]>(),
        AuditLogModel.countDocuments(query),
    ]);
    return { data: docs, page, limit, total, totalPages: Math.ceil(total / limit) };
};
