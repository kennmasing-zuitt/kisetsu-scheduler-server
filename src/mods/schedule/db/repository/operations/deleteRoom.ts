import { RoomModel } from '../../room.model.js';

export const deleteRoom = async (_id: string): Promise<boolean> => {
    const result = await RoomModel.deleteOne({ _id });
    return result.deletedCount > 0;
};
