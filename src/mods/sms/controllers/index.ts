import { ReadSmsLogsHandler } from './handlers/readSmsLogs.js';
import { SmsLogFieldsHandler } from './handlers/smsLogFields.js';

/** Domain Namespace Pattern: every GraphQL handler of the SMS domain. */
export const SmsHandlers = { ReadSmsLogsHandler, SmsLogFieldsHandler } as const;
