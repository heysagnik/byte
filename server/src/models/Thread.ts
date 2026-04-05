import { Schema, model, Document, Types } from 'mongoose';

export interface IThread extends Document {
  userId: Types.ObjectId;
  title: string;
  createdAt: Date;
}

const ThreadSchema = new Schema<IThread>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, default: 'New conversation' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Thread = model<IThread>('Thread', ThreadSchema);
