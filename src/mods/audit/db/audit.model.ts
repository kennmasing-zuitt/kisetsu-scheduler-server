import { model, Schema } from 'mongoose';
import { AUDIT_ACTION_VALUES } from './_audit.enum.js';

/** Append-only record of privileged actions (who did what to whom, when and why). */
export const AuditLogSchema = new Schema(
    {
        action: { type: String, required: true, enum: AUDIT_ACTION_VALUES, index: true },
        actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        targetId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
        reason: { type: String, trim: true },
        details: { type: Schema.Types.Mixed },
        requestId: { type: String },
        ip: { type: String },
    },
    {
        collection: 'AuditLog',
        timestamps: { createdAt: true, updatedAt: false },
    },
);

export const AuditLogModel = model('AuditLog', AuditLogSchema);
