import { FieldResolver, ID, Resolver, Root } from 'type-graphql';
import type { AuditLog } from '../../db/_audit.types.js';
import { AuditLogObject } from '../../dto/audit.dto.js';

@Resolver(() => AuditLogObject)
export class AuditLogFieldsHandler {
    @FieldResolver(() => ID)
    id(@Root() log: AuditLog): string {
        return String(log._id);
    }

    @FieldResolver(() => ID)
    actorId(@Root() log: AuditLog): string {
        return String(log.actorId);
    }

    @FieldResolver(() => ID, { nullable: true })
    targetId(@Root() log: AuditLog): string | null {
        return log.targetId ? String(log.targetId) : null;
    }
}
