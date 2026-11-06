import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";

export interface UserDocument extends mongoose.Document {
  fullName: string;
  email: string;
  // Absent for accounts created through Google until the user sets one.
  password?: string;
  googleId?: string;
  // Telegram user id, set once the account is linked from the Telegram Mini App.
  telegramId?: string;
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
      required: [
        function (this: UserDocument) {
          return !this.googleId;
        },
        "Parol kiritilishi shart",
      ],
      minlength: [6, "Parol kamida 6 belgidan iborat bo'lishi kerak"],
      select: false,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    telegramId: {
      type: String,
      unique: true,
      sparse: true,
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
  if (!this.isModified("password") || !this.password) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function comparePassword(candidate: string) {
  // Google-only accounts have no password, so password login simply fails.
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

export const User =
  (mongoose.models.User as mongoose.Model<UserDocument>) ?? mongoose.model<UserDocument>("User", userSchema);
