import mongoose, { Schema } from "mongoose";

// One call of a conversion endpoint and what Facebook answered. Kept for 90
// days so the dashboard can show recent requests and why one failed.
export interface ConversionEventDocument extends mongoose.Document {
  user: mongoose.Types.ObjectId;
  endpoint: mongoose.Types.ObjectId;
  eventName: string;
  // Sent to Facebook for de-duplication; also lets a retried request be recognised.
  eventId: string;
  fullName?: string;
  // Normalised to digits with the country code.
  phone?: string;
  summa?: number;
  currency?: string;
  status: "success" | "failed";
  errorMessage?: string;
  fbtraceId?: string;
  // True when the endpoint was in test mode (events only go to "Test events").
  test: boolean;
  createdAt: Date;
}

const NINETY_DAYS_SECONDS = 60 * 60 * 24 * 90;

const conversionEventSchema = new Schema<ConversionEventDocument>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  endpoint: { type: Schema.Types.ObjectId, ref: "ConversionEndpoint", required: true },
  eventName: { type: String, required: true },
  eventId: { type: String, required: true },
  fullName: { type: String },
  phone: { type: String },
  summa: { type: Number },
  currency: { type: String },
  status: { type: String, enum: ["success", "failed"], required: true },
  errorMessage: { type: String },
  fbtraceId: { type: String },
  test: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, expires: NINETY_DAYS_SECONDS },
});

conversionEventSchema.index({ endpoint: 1, eventId: 1 });
conversionEventSchema.index({ user: 1, createdAt: -1 });

export const ConversionEvent =
  (mongoose.models.ConversionEvent as mongoose.Model<ConversionEventDocument>) ??
  mongoose.model<ConversionEventDocument>("ConversionEvent", conversionEventSchema);
