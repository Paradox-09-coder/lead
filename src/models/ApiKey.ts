import mongoose, { Schema } from "mongoose";

// The plaintext key is stored (`select: false`) so the owner can see it again
// later from the dashboard. `keyHash` is still kept for fast auth lookups.
export interface ApiKeyDocument extends mongoose.Document {
  user: mongoose.Types.ObjectId;
  name: string;
  prefix: string;
  key: string;
  keyHash: string;
  lastUsedAt?: Date;
  createdAt: Date;
}

const apiKeySchema = new Schema<ApiKeyDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    prefix: { type: String, required: true },
    key: { type: String, required: true, select: false },
    keyHash: { type: String, required: true, unique: true, select: false },
    lastUsedAt: { type: Date },
  },
  { timestamps: true },
);

export const ApiKey =
  (mongoose.models.ApiKey as mongoose.Model<ApiKeyDocument>) ??
  mongoose.model<ApiKeyDocument>("ApiKey", apiKeySchema);
