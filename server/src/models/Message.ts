import { Schema, model, Document, Types } from 'mongoose';

export type MessageRole = 'user' | 'agent' | 'system';

export interface IMessageImage {
  dataUrl: string;
  mimeType: string;
  name: string;
}

export interface IMessage extends Document {
  threadId: Types.ObjectId;
  role: MessageRole;
  content: string;
  images?: IMessageImage[];
  metadata: Record<string, unknown>;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    threadId: { type: Schema.Types.ObjectId, ref: 'Thread', required: true, index: true },
    role: { type: String, enum: ['user', 'agent', 'system'], required: true },
    content: { type: String, default: '' },
    images: [{
      dataUrl: { type: String, required: true },
      mimeType: { type: String, required: true },
      name: { type: String, required: true },
    }],
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Message = model<IMessage>('Message', MessageSchema);
