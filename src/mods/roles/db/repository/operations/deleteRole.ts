import { RoleModel } from '../../role.model.js';

export const deleteRole = async (key: string): Promise<boolean> => {
    const result = await RoleModel.deleteOne({ key });
    return result.deletedCount > 0;
};
