import { Schema, model, Document, Types } from 'mongoose';

export interface IServiceCredential extends Document {
  userId: Types.ObjectId;
  service: string;       // 'twitter', 'google', 'github', etc.
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scope: string;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceCredentialSchema = new Schema<IServiceCredential>(
  {
    userId:       { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    service:      { type: String, required: true },
    accessToken:  { type: String, required: true },
    refreshToken: { type: String, default: null },
    expiresAt:    { type: Date,   default: null },
    scope:        { type: String, default: '' },
  },
  { timestamps: true }
);

// One credential per user per service
ServiceCredentialSchema.index({ userId: 1, service: 1 }, { unique: true });

export const ServiceCredential = model<IServiceCredential>('ServiceCredential', ServiceCredentialSchema);
