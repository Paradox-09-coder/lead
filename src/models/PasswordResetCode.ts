import mongoose, { Schema } from "mongoose";

// A short-lived code emailed to the user so they can confirm a password
// change. The code itself isn't stored — only its SHA-256 hash — so even a DB
// leak doesn't expose active codes. `expiresAt` is backed by a TTL index so
// Mongo removes stale rows itself.
export interface PasswordResetCodeDocument extends mongoose.Document {
  user: mongoose.Types.ObjectId;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
}

const schema = new Schema<PasswordResetCodeDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: true },
);

export const PasswordResetCode =
  (mongoose.models.PasswordResetCode as mongoose.Model<PasswordResetCodeDocument>) ??
  mongoose.model<PasswordResetCodeDocument>("PasswordResetCode", schema);
