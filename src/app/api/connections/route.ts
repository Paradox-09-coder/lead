import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Connection, type ConnectionDocument } from "@/models/Connection";
import { getSessionUserId } from "@/lib/server-session";
import { verifyBitrix24Webhook } from "@/lib/verify-bitrix24";
import { verifyAmoCrmToken } from "@/lib/verify-amocrm";
import { toErrorResponseBody } from "@/lib/api-error";

export const runtime = "nodejs";

const PLATFORM_NAMES: Record<string, string> = {
  bitrix24: "Bitrix24",
  amocrm: "amoCRM / Kommo",
  facebook: "Facebook",
  google: "Google",
};

function toPublicConnection(connection: ConnectionDocument) {
  return {
    _id: connection._id,
    platform: connection.platform,
    label: connection.label,
    accountUrl: connection.accountUrl,
    pageId: connection.pageId,
    createdAt: connection.createdAt,
  };
}

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ message: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }

  await connectDB();
  const connections = await Connection.find({ user: userId }).sort({ createdAt: -1 });
  return NextResponse.json(connections.map(toPublicConnection));
}

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ message: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }

  try {
    const { platform, webhookUrl, accountUrl, jwtToken, pageId, pageName, pageAccessToken } =
      (await request.json()) as {
        platform?: string;
        webhookUrl?: string;
        accountUrl?: string;
        jwtToken?: string;
        pageId?: string;
        pageName?: string;
        pageAccessToken?: string;
      };

    if (!platform || !PLATFORM_NAMES[platform]) {
      return NextResponse.json({ message: "Platforma noto'g'ri tanlangan" }, { status: 400 });
    }

    await connectDB();

    if (platform === "bitrix24") {
      if (!webhookUrl) {
        return NextResponse.json({ message: "Webhook URL kiritilishi shart" }, { status: 400 });
      }

      let profile: { NAME?: string; LAST_NAME?: string } | undefined;
      try {
        profile = (await verifyBitrix24Webhook(webhookUrl)) as { NAME?: string; LAST_NAME?: string };
      } catch (error) {
        return NextResponse.json(
          { message: error instanceof Error ? error.message : "Bitrix24'ga ulanmadi" },
          { status: 422 },
        );
      }

      const label = profile?.NAME ? `${profile.NAME} ${profile.LAST_NAME ?? ""}`.trim() : new URL(webhookUrl).hostname;
      const connection = await Connection.create({ user: userId, platform, label, webhookUrl });
      return NextResponse.json(toPublicConnection(connection), { status: 201 });
    }

    if (platform === "amocrm") {
      if (!accountUrl || !jwtToken) {
        return NextResponse.json({ message: "Account URL va token kiritilishi shart" }, { status: 400 });
      }

      try {
        await verifyAmoCrmToken(accountUrl, jwtToken);
      } catch (error) {
        return NextResponse.json(
          { message: error instanceof Error ? error.message : "amoCRM/Kommo'ga ulanmadi" },
          { status: 422 },
        );
      }

      const label = new URL(accountUrl.replace(/\/$/, "")).hostname;
      const connection = await Connection.create({ user: userId, platform, label, accountUrl, jwtToken });
      return NextResponse.json(toPublicConnection(connection), { status: 201 });
    }

    if (platform === "facebook") {
      if (!pageId || !pageAccessToken) {
        return NextResponse.json({ message: "Facebook sahifa ma'lumotlari to'liq emas" }, { status: 400 });
      }

      const connection = await Connection.findOneAndUpdate(
        { user: userId, platform, pageId },
        { label: pageName || pageId, pageAccessToken },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );
      return NextResponse.json(toPublicConnection(connection), { status: 201 });
    }

    return NextResponse.json(
      { message: `${PLATFORM_NAMES[platform]} ulanishi hali qo'llab-quvvatlanmaydi` },
      { status: 400 },
    );
  } catch (err) {
    const { message, status } = toErrorResponseBody(err);
    return NextResponse.json({ message }, { status });
  }
}
