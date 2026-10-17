import type { RoleKey } from '../../mods/users/db/_users.enum.js';

/** The authenticated caller, set once by verifyToken as `req.user` / `ctx.user`. */
export interface AuthUser {
    id: string;
    roles: RoleKey[];
}

/** Claims inside every access token. `sub` is the user id, `ver` the user's tokenVersion. */
export interface AccessTokenClaims {
    sub: string;
    ver: number;
    roles: RoleKey[];
}
