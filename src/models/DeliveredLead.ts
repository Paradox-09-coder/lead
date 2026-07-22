import mongoose, { Schema } from "mongoose";

// Records every Facebook leadgen_id we've already processed, so a webhook
// retry (Meta redelivers on non-2xx or timeout) never creates a duplicate
// lead in the target CRM.
export interface DeliveredLeadDocument extends mongoose.Document {
  leadgenId: string;
  integration: mongoose.Types.ObjectId;
  crmLeadId?: string;
  createdAt: Date;
}

const deliveredLeadSchema = new Schema<DeliveredLeadDocument>(
  {
    leadgenId: {
      type: String,
      required: true,
      unique: true,
    },
    integration: {
      type: Schema.Types.ObjectId,
      ref: "Integration",
      required: true,
    },
    crmLeadId: {
      type: String,
    },
  },
  { timestamps: true },
);

export const DeliveredLead =
  (mongoose.models.DeliveredLead as mongoose.Model<DeliveredLeadDocument>) ??
  mongoose.model<DeliveredLeadDocument>("DeliveredLead", deliveredLeadSchema);
