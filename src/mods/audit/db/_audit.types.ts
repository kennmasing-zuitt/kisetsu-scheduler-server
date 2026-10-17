import type { InferSchemaType, Types } from 'mongoose';
import type { AuditAction } from './_audit.enum.js';
import type { AuditLogSchema } from './audit.model.js';

export type AuditLog = InferSchemaType<typeof AuditLogSchema> & { _id: Types.ObjectId };

export interface CreateAuditLogData {
    action: AuditAction;
    actorId: string;
    targetId?: string;
    reason?: string;
    details?: Record<string, unknown>;
    requestId?: string;
    ip?: string;
}

/** Request metadata recorded with each entry; build it with `auditMeta(ctx)`. */
export interface AuditMeta {
    actorId: string;
    requestId?: string;
    ip?: string;
}
