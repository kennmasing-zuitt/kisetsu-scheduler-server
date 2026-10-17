import { GraphQLJSONObject } from 'graphql-scalars';
import { ArgsType, Field, ID, ObjectType, registerEnumType } from 'type-graphql';
import { PaginatedResponse, PaginationArgs } from '../../../shared/graphql/pagination.types.js';
import { AuditAction } from '../db/_audit.enum.js';

registerEnumType(AuditAction, { name: 'AuditAction' });

@ObjectType('AuditLog', { description: 'A privileged action: who did what to whom, and why' })
export class AuditLogObject {
    @Field(() => ID)
    id!: string;

    @Field(() => AuditAction)
    action!: AuditAction;

    @Field(() => ID, { description: 'The admin who performed the action' })
    actorId!: string;

    @Field(() => ID, { nullable: true, description: 'The affected user, if any' })
    targetId?: string;

    @Field(() => String, { nullable: true })
    reason?: string;

    @Field(() => GraphQLJSONObject, { nullable: true })
    details?: Record<string, unknown>;

    @Field(() => String, { nullable: true })
    requestId?: string;

    @Field(() => String, { nullable: true })
    ip?: string;

    @Field(() => Date)
    createdAt!: Date;
}

@ObjectType('AuditLogPage')
export class AuditLogPage extends PaginatedResponse(AuditLogObject) {}

@ArgsType()
export class AuditLogArgs extends PaginationArgs {
    @Field(() => AuditAction, { nullable: true })
    action?: AuditAction;

    @Field(() => ID, { nullable: true })
    actorId?: string;

    @Field(() => ID, { nullable: true })
    targetId?: string;
}
