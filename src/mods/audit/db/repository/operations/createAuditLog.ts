import type { CreateAuditLogData } from '../../_audit.types.js';
import { AuditLogModel } from '../../audit.model.js';

export const createAuditLog = async (data: CreateAuditLogData): Promise<void> => {
    await AuditLogModel.create(data);
};
