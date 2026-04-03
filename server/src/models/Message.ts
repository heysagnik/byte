import { Schema, model, Document, Types } from 'mongoose';

export type MessageRole = 'user' | 'agent' | 'system';

export interface IMessage extends Document {
  threadId: Types.ObjectId;
  role: MessageRole;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    threadId: { type: Schema.Types.ObjectId, ref: 'Thread', required: true, index: true },
    role: { type: String, enum: ['user', 'agent', 'system'], required: true },
    content: { type: String, default: '' },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Message = model<IMessage>('Message', MessageSchema);
