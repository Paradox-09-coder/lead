import mongoose, { Schema } from "mongoose";

export const WEB_FORM_SOURCES = ["telegram", "instagram", "facebook", "website", "other"] as const;
export type WebFormSource = (typeof WEB_FORM_SOURCES)[number];

// A hosted lead form reachable at /f/<slug>. Anyone with the link can submit
// it; each submission becomes a Lead delivered to `targetConnection`.
export interface WebFormDocument extends mongoose.Document {
  user: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  source: WebFormSource;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  targetConnection: mongoose.Types.ObjectId;
  stageId?: string;
  createdAt: Date;
}

const webFormSchema = new Schema<WebFormDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    source: { type: String, enum: WEB_FORM_SOURCES, required: true },
    utmMedium: { type: String },
    utmCampaign: { type: String },
    utmContent: { type: String },
    targetConnection: { type: Schema.Types.ObjectId, ref: "Connection", required: true },
    stageId: { type: String },
  },
  { timestamps: true },
);

export const WebForm =
  (mongoose.models.WebForm as mongoose.Model<WebFormDocument>) ??
  mongoose.model<WebFormDocument>("WebForm", webFormSchema);
