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

// A "hidden field": a CRM field that gets the same fixed value on every lead of
// the integration, no matter what the Facebook form asked. The type info is
// copied from the CRM when the integration is saved, like for `FieldMappingEntry`.
export interface HiddenFieldEntry {
  crmField: string;
  crmFieldLabel?: string;
  value: string;
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
  // Bitrix24 lead source (SOURCE_ID). Absent = the default, "FACEBOOK".
  sourceId?: string;
  // Absent on integrations created before field mapping existed: those send
  // name / phone / email only.
  fieldMapping?: FieldMappingEntry[];
  hiddenFields?: HiddenFieldEntry[];
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

const hiddenFieldSchema = new Schema<HiddenFieldEntry>(
  {
    crmField: { type: String, required: true },
    crmFieldLabel: { type: String },
    value: { type: String, required: true },
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
    sourceId: {
      type: String,
    },
    fieldMapping: {
      type: [fieldMappingSchema],
      default: undefined,
    },
    hiddenFields: {
      type: [hiddenFieldSchema],
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
