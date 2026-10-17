export enum AuditAction {
    impersonationStarted = 'impersonationStarted',
    userLoggedOut = 'userLoggedOut',
    userAccessChanged = 'userAccessChanged',
    roleCreated = 'roleCreated',
    roleUpdated = 'roleUpdated',
    roleDeleted = 'roleDeleted',
}
export const AUDIT_ACTION_VALUES = Object.values(AuditAction) as AuditAction[];
