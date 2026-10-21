import type { AppModule } from '../shared/shared.types.js';
import { exampleModule } from './_example/index.js';
import { auditModule } from './audit/index.js';
import { authModule } from './auth/index.js';
import { reportsModule } from './reports/index.js';
import { rolesModule } from './roles/index.js';
import { scheduleModule } from './schedule/index.js';
import { smsModule } from './sms/index.js';
import { userModule } from './users/index.js';

// Each module contributes its resolver classes to the single GraphQL schema
export const mods: AppModule[] = [
    exampleModule,
    authModule,
    userModule,
    rolesModule,
    auditModule,
    scheduleModule,
    reportsModule,
    smsModule,
];
