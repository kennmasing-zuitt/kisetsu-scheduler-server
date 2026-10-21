export enum AuditAction {
    impersonationStarted = 'impersonationStarted',
    userLoggedOut = 'userLoggedOut',
    userAccessChanged = 'userAccessChanged',
    roleCreated = 'roleCreated',
    roleUpdated = 'roleUpdated',
    roleDeleted = 'roleDeleted',
    twoFactorReset = 'twoFactorReset',
}
export const AUDIT_ACTION_VALUES = Object.values(AuditAction) as AuditAction[];
