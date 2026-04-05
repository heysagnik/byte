import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name?: string;
  pronouns?: string;
  autoLocation?: boolean;
  /** Last known location label from IP geolocation (e.g. "Bengaluru, Karnataka") */
  location?: string;
  /** Last known IANA timezone string from IP (e.g. "Asia/Kolkata") */
  timezone?: string;
  /** Last known ISO country code from IP (e.g. "IN") */
  country?: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, trim: true },
    pronouns: { type: String, trim: true },
    autoLocation: { type: Boolean, default: false },
    location: { type: String, trim: true },
    timezone: { type: String, trim: true },
    country: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const User = model<IUser>('User', UserSchema);
