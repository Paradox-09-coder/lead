import mongoose, { Schema } from "mongoose";

export type LeadStatus = "pending" | "success" | "failed" | "saved";

// One record per lead that reached LeadSync — from a Facebook lead form or
// from an external app through the public API. `saved` means the lead was
// stored but there was no CRM connection to deliver it to.
export interface LeadDocument extends mongoose.Document {
  user: mongoose.Types.ObjectId;
  source: "facebook" | "api";
  leadgenId?: string;
  integration?: mongoose.Types.ObjectId;
  targetConnection?: mongoose.Types.ObjectId;
  stageId?: string;
  pageId?: string;
  formId?: string;
  fields: { name?: string; phone?: string; email?: string };
  rawFieldData?: unknown;
  status: LeadStatus;
  crmLeadId?: string;
  errorMessage?: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const leadSchema = new Schema<LeadDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    source: { type: String, enum: ["facebook", "api"], required: true },
    // Unique per Facebook lead so a webhook redelivery never duplicates it.
    leadgenId: { type: String, unique: true, sparse: true },
    integration: { type: Schema.Types.ObjectId, ref: "Integration" },
    targetConnection: { type: Schema.Types.ObjectId, ref: "Connection" },
    stageId: { type: String },
    pageId: { type: String },
    formId: { type: String },
    fields: {
      name: { type: String },
      phone: { type: String },
      email: { type: String },
    },
    rawFieldData: { type: Schema.Types.Mixed },
    status: { type: String, enum: ["pending", "success", "failed", "saved"], default: "pending" },
    crmLeadId: { type: String },
    errorMessage: { type: String },
    retryCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

leadSchema.index({ user: 1, createdAt: -1 });
leadSchema.index({ user: 1, status: 1 });

export const Lead =
  (mongoose.models.Lead as mongoose.Model<LeadDocument>) ?? mongoose.model<LeadDocument>("Lead", leadSchema);
