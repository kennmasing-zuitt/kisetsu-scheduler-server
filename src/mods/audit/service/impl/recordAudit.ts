import type { AuditAction } from '../../db/_audit.enum.js';
import type { AuditMeta } from '../../db/_audit.types.js';
import * as AuditOperations from '../../db/repository/index.js';

export interface RecordAuditInput {
    action: AuditAction;
    targetId?: string;
    reason?: string;
    details?: Record<string, unknown>;
}

/** Writes one audit entry. Awaited by callers, so a failed write fails the privileged action. */
export const recordAudit = async (meta: AuditMeta, input: RecordAuditInput): Promise<void> =>
    AuditOperations.createAuditLog({ ...input, ...meta });
