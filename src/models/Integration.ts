import mongoose, { Schema } from "mongoose";

// One Facebook form question and the CRM field its answer is written to.
// An empty `crmField` means "no field": the answer goes into the lead's comment.
export interface FieldMappingEntry {
  questionKey: string;
  questionLabel?: string;
  crmField: string;
  // Copied from the CRM when the integration is saved, so a lead can be built
  // without another round trip to the CRM.
  crmFieldType?: string;
  crmFieldMultiple?: boolean;
  crmItems?: { id: string; value: string }[];
}

export interface IntegrationDocument extends mongoose.Document {
  user: mongoose.Types.ObjectId;
  name: string;
  facebookConnection: mongoose.Types.ObjectId;
  pageId: string;
  formId: string;
  formName: string;
  targetConnection: mongoose.Types.ObjectId;
  stageId?: string;
  // Absent on integrations created before field mapping existed: those send
  // name / phone / email only.
  fieldMapping?: FieldMappingEntry[];
  duplicateCheck: boolean;
  status: "active" | "paused";
  createdAt: Date;
}

const fieldMappingSchema = new Schema<FieldMappingEntry>(
  {
    questionKey: { type: String, required: true },
    questionLabel: { type: String },
    crmField: { type: String, default: "" },
    crmFieldType: { type: String },
    crmFieldMultiple: { type: Boolean },
    crmItems: { type: [new Schema({ id: String, value: String }, { _id: false })], default: undefined },
  },
  { _id: false },
);

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
    fieldMapping: {
      type: [fieldMappingSchema],
      default: undefined,
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
