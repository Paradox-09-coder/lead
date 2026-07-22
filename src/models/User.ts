import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";

export interface UserDocument extends mongoose.Document {
  fullName: string;
  email: string;
  password: string;
  role: "user" | "admin";
  createdAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<UserDocument>(
  {
    fullName: {
      type: String,
      required: [true, "To'liq ism kiritilishi shart"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email kiritilishi shart"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Email formati noto'g'ri"],
    },
    password: {
      type: String,
      required: [true, "Parol kiritilishi shart"],
      minlength: [6, "Parol kamida 6 belgidan iborat bo'lishi kerak"],
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
  },
  { timestamps: true },
);

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = function comparePassword(candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

export const User =
  (mongoose.models.User as mongoose.Model<UserDocument>) ?? mongoose.model<UserDocument>("User", userSchema);
