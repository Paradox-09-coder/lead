import type { Metadata } from "next";
import { TelegramEntry } from "@/components/TelegramEntry";

export const metadata: Metadata = {
  title: "LeadSync",
  robots: { index: false },
};

// The URL the Telegram bot's menu button / Mini App opens.
export default function TelegramPage() {
  return <TelegramEntry />;
}
