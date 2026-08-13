import Like from '../models/Like.js';
import Match from '../models/Match.js';
import Message from '../models/Message.js';

// Removes a deleted user's likes/matches/messages so downstream populate() calls
// never resolve a null user reference. Shared by both self-delete and admin-delete
// so the two paths can't drift out of sync.
export const cascadeDeleteUserData = async (userId) => {
  await Promise.all([
    Like.deleteMany({ $or: [{ likedBy: userId }, { likedUser: userId }] }),
    Match.deleteMany({ $or: [{ user1: userId }, { user2: userId }] }),
    Message.deleteMany({ $or: [{ sender: userId }, { receiver: userId }] }),
  ]);
};
