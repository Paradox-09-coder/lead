import mongoose, { Schema } from "mongoose";

export interface OrderDocument extends mongoose.Document {
  user: mongoose.Types.ObjectId;
  planId: string;
  planName: string;
  amount: number;
  status: "pending" | "paid" | "cancelled";
  paidAt?: Date;
  createdAt: Date;
}

const orderSchema = new Schema<OrderDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    planId: { type: String, required: true },
    planName: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["pending", "paid", "cancelled"], default: "pending" },
    paidAt: { type: Date },
  },
  { timestamps: true },
);

export const Order =
  (mongoose.models.Order as mongoose.Model<OrderDocument>) ??
  mongoose.model<OrderDocument>("Order", orderSchema);
