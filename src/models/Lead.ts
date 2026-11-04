import mongoose, { Schema } from "mongoose";

export type LeadStatus = "pending" | "success" | "failed" | "saved";

export type LeadSource = "facebook" | "api" | "form";

export interface LeadUtm {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
}

// One record per lead that reached LeadSync — from a Facebook lead form, a
// LeadSync web form, or an external app through the public API. `saved` means
// the lead was stored but there was no CRM connection to deliver it to.
export interface LeadDocument extends mongoose.Document {
  user: mongoose.Types.ObjectId;
  source: LeadSource;
  leadgenId?: string;
  integration?: mongoose.Types.ObjectId;
  webForm?: mongoose.Types.ObjectId;
  webFormName?: string;
  utm?: LeadUtm;
  targetConnection?: mongoose.Types.ObjectId;
  stageId?: string;
  pageId?: string;
  formId?: string;
  // Facebook lead form name, copied from the integration so the list can say
  // which form a lead came from.
  formName?: string;
  fields: { name?: string; phone?: string; email?: string };
  rawFieldData?: unknown;
  status: LeadStatus;
  crmLeadId?: string;
  // True when the CRM already had this lead (matched by phone/email), so
  // crmLeadId points at the existing card instead of a new one.
  crmDuplicate?: boolean;
  errorMessage?: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const leadSchema = new Schema<LeadDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    source: { type: String, enum: ["facebook", "api", "form"], required: true },
    // Unique per Facebook lead so a webhook redelivery never duplicates it.
    leadgenId: { type: String, unique: true, sparse: true },
    integration: { type: Schema.Types.ObjectId, ref: "Integration" },
    webForm: { type: Schema.Types.ObjectId, ref: "WebForm" },
    webFormName: { type: String },
    utm: {
      source: { type: String },
      medium: { type: String },
      campaign: { type: String },
      content: { type: String },
      term: { type: String },
    },
    targetConnection: { type: Schema.Types.ObjectId, ref: "Connection" },
    stageId: { type: String },
    pageId: { type: String },
    formId: { type: String },
    formName: { type: String },
    fields: {
      name: { type: String },
      phone: { type: String },
      email: { type: String },
    },
    rawFieldData: { type: Schema.Types.Mixed },
    status: { type: String, enum: ["pending", "success", "failed", "saved"], default: "pending" },
    crmLeadId: { type: String },
    crmDuplicate: { type: Boolean },
    errorMessage: { type: String },
    retryCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

leadSchema.index({ user: 1, createdAt: -1 });
leadSchema.index({ user: 1, status: 1 });

export const Lead =
  (mongoose.models.Lead as mongoose.Model<LeadDocument>) ?? mongoose.model<LeadDocument>("Lead", leadSchema);
