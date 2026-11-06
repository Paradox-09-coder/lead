import mongoose, { Schema } from "mongoose";
import {
  CONVERSION_CURRENCIES,
  CONVERSION_EVENT_NAMES,
  type ConversionCurrency,
  type ConversionEventName,
} from "@/lib/conversion-options";

// One public URL (/api/conversions/<key>) that sends a Facebook Conversions API
// event to one Pixel (dataset) every time it is called. The access token is the
// Conversions API token generated in Events Manager for that Pixel.
export interface ConversionEndpointDocument extends mongoose.Document {
  user: mongoose.Types.ObjectId;
  name: string;
  // Unguessable part of the public URL: knowing it is the only credential.
  key: string;
  pixelId: string;
  // The dataset's name as Facebook reported it when the endpoint was saved.
  pixelName?: string;
  accessToken: string;
  eventName: ConversionEventName;
  currency: ConversionCurrency;
  // Prepended to phone numbers that come without one (9 digits or fewer).
  countryCode: string;
  // While set, events go to Events Manager's "Test events" tab only.
  testEventCode?: string;
  status: "active" | "paused";
  createdAt: Date;
}

const conversionEndpointSchema = new Schema<ConversionEndpointDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    key: { type: String, required: true, unique: true },
    pixelId: { type: String, required: true },
    pixelName: { type: String },
    accessToken: { type: String, required: true, select: false },
    eventName: { type: String, enum: CONVERSION_EVENT_NAMES, default: "Purchase" },
    currency: { type: String, enum: CONVERSION_CURRENCIES, default: "USD" },
    countryCode: { type: String, default: "998" },
    testEventCode: { type: String },
    status: { type: String, enum: ["active", "paused"], default: "active" },
  },
  { timestamps: true },
);

export const ConversionEndpoint =
  (mongoose.models.ConversionEndpoint as mongoose.Model<ConversionEndpointDocument>) ??
  mongoose.model<ConversionEndpointDocument>("ConversionEndpoint", conversionEndpointSchema);
