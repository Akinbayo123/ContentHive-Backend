import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    file: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File', // optional: file related to the purchase
      required: true,
    },
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' }
  },
  { timestamps: true }
);

const createChatIfNotExists = async (buyerId, creatorId, fileId) => {
  let chat = await Chat.findOne({
    participants: { $all: [buyerId, creatorId] },
    file: fileId
  });

  if (!chat) {
    chat = await Chat.create({
      participants: [buyerId, creatorId],
      file: fileId
    });
  }

  return chat;
};

export default mongoose.model('Chat', chatSchema);
