import { Args, Authorized, Query, Resolver } from 'type-graphql';
import { PaginationSchema, type Paginated } from '../../../../shared/pagination.js';
import { ObjectIdSchema, parseInput } from '../../../../shared/validation.js';
// Leaf enum file imported directly: going through the roles root would create an import cycle
// (roles -> audit -> roles) evaluated at decorator time
import { Permission } from '../../../roles/db/_roles.enum.js';
import type { AuditLog } from '../../db/_audit.types.js';
import { AuditLogArgs, AuditLogPage } from '../../dto/audit.dto.js';
import * as AuditImpl from '../../service/index.js';

@Resolver()
export class ListAuditLogsHandler {
    @Authorized(Permission.readAuditLogs)
    @Query(() => AuditLogPage, { description: 'Privileged actions, newest first. Admin only.' })
    async auditLogs(@Args(() => AuditLogArgs) args: AuditLogArgs): Promise<Paginated<AuditLog>> {
        const { action, actorId, targetId, ...page } = args;
        return AuditImpl.listAuditLogs(parseInput(PaginationSchema, page), {
            action,
            actorId: actorId ? parseInput(ObjectIdSchema, actorId) : undefined,
            targetId: targetId ? parseInput(ObjectIdSchema, targetId) : undefined,
        });
    }
}
