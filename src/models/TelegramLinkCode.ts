import mongoose, { Schema } from "mongoose";

// A one-time code that links a Telegram account to a LeadSync account. The user
// asks for it on the website (Settings), then sends it to the bot through a
// t.me/<bot>?start=<code> link. Only its SHA-256 hash is stored, and MongoDB
// removes the row itself once `expiresAt` has passed.
export interface TelegramLinkCodeDocument extends mongoose.Document {
  user: mongoose.Types.ObjectId;
  codeHash: string;
  expiresAt: Date;
}

const telegramLinkCodeSchema = new Schema<TelegramLinkCodeDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    codeHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: true },
);

export const TelegramLinkCode =
  (mongoose.models.TelegramLinkCode as mongoose.Model<TelegramLinkCodeDocument>) ??
  mongoose.model<TelegramLinkCodeDocument>("TelegramLinkCode", telegramLinkCodeSchema);
