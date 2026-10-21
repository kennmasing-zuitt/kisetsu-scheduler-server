import { Arg, Authorized, Int, Query, Resolver } from 'type-graphql';
import { Permission } from '../../../roles/index.js';
import type { SmsLogDocument } from '../../db/_sms.types.js';
import { SmsLogObject, SmsStatus } from '../../dto/sms.dto.js';
import * as SmsImpl from '../../service/index.js';

@Resolver()
export class ReadSmsLogsHandler {
    @Authorized(Permission.readSmsLogs)
    @Query(() => [SmsLogObject], {
        description: 'Text messages, newest first (e.g. status: failed)',
    })
    async smsLogs(
        @Arg('status', () => SmsStatus, { nullable: true }) status: SmsStatus | null,
        @Arg('limit', () => Int, { defaultValue: 50 }) limit: number,
    ): Promise<SmsLogDocument[]> {
        return SmsImpl.readSmsLogs(status, limit);
    }
}
