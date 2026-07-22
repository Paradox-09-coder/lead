import mongoose, { Schema } from "mongoose";

export interface ConnectionDocument extends mongoose.Document {
  user: mongoose.Types.ObjectId;
  platform: "bitrix24" | "amocrm" | "facebook" | "google";
  label: string;
  // Bitrix24: the inbound webhook URL is itself the credential.
  webhookUrl?: string;
  // amoCRM/Kommo: account URL + long-lived JWT token.
  accountUrl?: string;
  jwtToken?: string;
  // Facebook: one connection per Page the user granted access to.
  pageId?: string;
  pageAccessToken?: string;
  createdAt: Date;
}

const connectionSchema = new Schema<ConnectionDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    platform: {
      type: String,
      enum: ["bitrix24", "amocrm", "facebook", "google"],
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
    webhookUrl: {
      type: String,
      select: false,
    },
    accountUrl: {
      type: String,
    },
    jwtToken: {
      type: String,
      select: false,
    },
    pageId: {
      type: String,
    },
    pageAccessToken: {
      type: String,
      select: false,
    },
  },
  { timestamps: true },
);

export const Connection =
  (mongoose.models.Connection as mongoose.Model<ConnectionDocument>) ??
  mongoose.model<ConnectionDocument>("Connection", connectionSchema);
