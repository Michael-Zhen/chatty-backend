import mongoose from 'mongoose';
import { PushOperator } from 'mongodb';
import { UserModel } from '@user/models/user.schema';

class BlockUserService {
  public async blockUser(userId: string, followerId: string): Promise<void> {
    const objectIdUserId = new mongoose.Types.ObjectId(userId);
    const objectIdFollowerId = new mongoose.Types.ObjectId(followerId);

    UserModel.bulkWrite([
      {
        updateOne: {
          filter: {
            _id: objectIdUserId,
            blocked: { $ne: objectIdFollowerId },
          },
          update: {
            $push: {
              blocked: objectIdFollowerId,
            } as PushOperator<Document>,
          },
        },
      },
      {
        updateOne: {
          filter: {
            _id: objectIdFollowerId,
            blockedBy: { $ne: objectIdUserId },
          },
          update: {
            $push: {
              blockedBy: objectIdUserId,
            } as PushOperator<Document>,
          },
        },
      },
    ]);
  }

  public async unblockUser(userId: string, followerId: string): Promise<void> {
    const objectIdUserId = new mongoose.Types.ObjectId(userId);
    const objectIdFollowerId = new mongoose.Types.ObjectId(followerId);

    UserModel.bulkWrite([
      {
        updateOne: {
          filter: { _id: objectIdUserId },
          update: {
            $pull: {
              blocked: objectIdFollowerId,
            } as PushOperator<Document>,
          },
        },
      },
      {
        updateOne: {
          filter: { _id: objectIdFollowerId },
          update: {
            $pull: {
              blockedBy: objectIdUserId,
            } as PushOperator<Document>,
          },
        },
      },
    ]);
  }
}

export const blockUserService: BlockUserService = new BlockUserService();
