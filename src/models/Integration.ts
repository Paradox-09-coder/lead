import mongoose, { Schema } from "mongoose";

export interface IntegrationDocument extends mongoose.Document {
  user: mongoose.Types.ObjectId;
  name: string;
  facebookConnection: mongoose.Types.ObjectId;
  pageId: string;
  formId: string;
  formName: string;
  targetConnection: mongoose.Types.ObjectId;
  stageId?: string;
  duplicateCheck: boolean;
  status: "active" | "paused";
  createdAt: Date;
}

const integrationSchema = new Schema<IntegrationDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    facebookConnection: {
      type: Schema.Types.ObjectId,
      ref: "Connection",
      required: true,
    },
    // Denormalized so the Facebook webhook receiver can look up the matching
    // integration by (pageId, formId) without an extra Connection join.
    pageId: {
      type: String,
      required: true,
      index: true,
    },
    formId: {
      type: String,
      required: true,
      index: true,
    },
    formName: {
      type: String,
      required: true,
    },
    targetConnection: {
      type: Schema.Types.ObjectId,
      ref: "Connection",
      required: true,
    },
    stageId: {
      type: String,
    },
    duplicateCheck: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["active", "paused"],
      default: "active",
    },
  },
  { timestamps: true },
);

export const Integration =
  (mongoose.models.Integration as mongoose.Model<IntegrationDocument>) ??
  mongoose.model<IntegrationDocument>("Integration", integrationSchema);
