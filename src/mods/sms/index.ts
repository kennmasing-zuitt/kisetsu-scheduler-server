import type { AppModule } from '../../shared/shared.types.js';
import { SmsHandlers } from './controllers/index.js';

// Module root: the only file other modules should import from.
// Sends text messages through the provider picked by SMS_PROVIDER and logs each one.
export * as SmsOperations from './db/repository/index.js';
export * as SmsImpl from './service/index.js';
export { SmsHandlers };
export { SmsLogModel } from './db/smsLog.model.js';
export * from './dto/sms.dto.js';
export { setSmsProviderForTests, SmsSendError, type SmsProvider } from './providers/index.js';
export type * from './db/_sms.types.js';

export const smsModule: AppModule = {
    name: 'sms',
    resolvers: Object.values(SmsHandlers),
};
