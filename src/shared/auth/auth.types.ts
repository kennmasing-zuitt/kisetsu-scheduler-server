import type { Permission, RoleKind } from '../../mods/roles/db/_roles.enum.js';

/** The authenticated caller, set once by verifyToken as `req.user` / `ctx.user`. */
export interface AuthUser {
    id: string;
    /** Role key, e.g. "user", "support", "super-admin". */
    role: string;
    roleKind: RoleKind;
    /** EFFECTIVE permissions: role perms + extraPerms, admin perms dropped for user-kind roles,
     *  every permission for a super admin. */
    perms: Permission[];
    /** Set when this request uses an impersonation token: the id of the admin acting as the user. */
    impersonatedBy?: string;
}

/**
 * Claims inside every access token. `sub` is the user id, `ver` the user's tokenVersion, `role`
 * the role key at signing time (informational: permissions are always re-read on each request).
 * Impersonation tokens also carry `act` (RFC 8693 "actor"): the admin's id and tokenVersion.
 */
export interface AccessTokenClaims {
    sub: string;
    ver: number;
    role?: string;
    act?: { sub: string; ver: number };
}
