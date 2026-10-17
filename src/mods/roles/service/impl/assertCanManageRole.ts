import type { AuthUser } from '../../../../shared/auth/auth.types.js';
import {
    assertPermsFitKind,
    isSuperAdmin,
    permsNotHeldBy,
} from '../../../../shared/auth/permissions.js';
import { ForbiddenError } from '../../../../shared/errors/AppError.js';
import { RoleKind, type Permission } from '../../db/_roles.enum.js';

/**
 * Hierarchy rules shared by createRole / updateRole / deleteRole:
 *  - admin-kind roles can only be managed by a super admin
 *  - you can only put permissions you hold into a role
 *  - user-kind roles can't hold admin permissions
 */
export function assertCanManageRole(actor: AuthUser, kind: RoleKind, perms: readonly Permission[]) {
    if (kind === RoleKind.admin && !isSuperAdmin(actor)) {
        throw new ForbiddenError('Only a super admin can manage admin roles');
    }
    const notHeld = permsNotHeldBy(actor, perms);
    if (notHeld.length > 0) {
        throw new ForbiddenError(
            `You cannot grant permissions you don't have: ${notHeld.join(', ')}`,
        );
    }
    assertPermsFitKind(kind, perms);
}
