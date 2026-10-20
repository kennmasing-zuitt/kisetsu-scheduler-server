/** What a role can hold: admin-kind roles may include admin permissions, user-kind roles can't. */
export enum RoleKind {
    admin = 'admin',
    user = 'user',
}
export const ROLE_KIND_VALUES = Object.values(RoleKind) as RoleKind[];

/**
 * Granular permissions. Roles hold a set of them; users get their role's permissions plus any
 * per-user `extraPerms`. `superAdmin` implies every permission.
 */
export enum Permission {
    // ---- admin permissions (only effective through an admin-kind role) ----
    superAdmin = 'superAdmin',
    readUsers = 'readUsers',
    manageUserAccess = 'manageUserAccess',
    readRoles = 'readRoles',
    manageRoles = 'manageRoles',
    logoutUsers = 'logoutUsers',
    impersonateUsers = 'impersonateUsers',
    readAuditLogs = 'readAuditLogs',
    // ---- user permissions ----
    createExample = 'createExample',
    updateExample = 'updateExample',
    deleteExample = 'deleteExample',
    // schedule
    createTherapist = 'createTherapist',
    updateTherapist = 'updateTherapist',
    deleteTherapist = 'deleteTherapist',
    createRoom = 'createRoom',
    updateRoom = 'updateRoom',
    deleteRoom = 'deleteRoom',
    createBooking = 'createBooking',
    updateBooking = 'updateBooking',
    deleteBooking = 'deleteBooking',
    createService = 'createService',
    updateService = 'updateService',
    deleteService = 'deleteService',
    // reports
    readReports = 'readReports',
}
export const PERMISSION_VALUES = Object.values(Permission) as Permission[];

export const ADMIN_PERMISSIONS: readonly Permission[] = [
    Permission.superAdmin,
    Permission.readUsers,
    Permission.manageUserAccess,
    Permission.readRoles,
    Permission.manageRoles,
    Permission.logoutUsers,
    Permission.impersonateUsers,
    Permission.readAuditLogs,
];

export const USER_PERMISSIONS: readonly Permission[] = [
    Permission.createExample,
    Permission.updateExample,
    Permission.deleteExample,
    Permission.createTherapist,
    Permission.updateTherapist,
    Permission.deleteTherapist,
    Permission.createRoom,
    Permission.updateRoom,
    Permission.deleteRoom,
    Permission.createBooking,
    Permission.updateBooking,
    Permission.deleteBooking,
    Permission.createService,
    Permission.updateService,
    Permission.deleteService,
    Permission.readReports,
];

/**
 * What the default `user` role gets for the schedule: manage bookings and therapists' days off /
 * leave. Adding or removing therapists and rooms is granted separately (or via super admin).
 */
export const DEFAULT_SCHEDULE_PERMISSIONS: readonly Permission[] = [
    Permission.updateTherapist,
    Permission.createBooking,
    Permission.updateBooking,
    Permission.deleteBooking,
];

/** System roles: always present (created on startup), can't be deleted. */
export const SUPER_ADMIN_ROLE_KEY = 'super-admin';
export const DEFAULT_ROLE_KEY = 'user';

export interface RoleDefinition {
    key: string;
    name: string;
    description: string;
    kind: RoleKind;
    perms: Permission[];
}

export const SYSTEM_ROLES: readonly RoleDefinition[] = [
    {
        key: SUPER_ADMIN_ROLE_KEY,
        name: 'Super Admin',
        description: 'Full access. Locked: cannot be edited or deleted.',
        kind: RoleKind.admin,
        perms: [Permission.superAdmin],
    },
    {
        key: DEFAULT_ROLE_KEY,
        name: 'User',
        description: 'Default role for new accounts.',
        kind: RoleKind.user,
        perms: [
            Permission.createExample,
            Permission.updateExample,
            ...DEFAULT_SCHEDULE_PERMISSIONS,
        ],
    },
];
