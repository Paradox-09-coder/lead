import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ApiKey } from "@/models/ApiKey";
import { getSessionUserId } from "@/lib/server-session";
import { generateApiKey } from "@/lib/api-keys";
import { toErrorResponseBody } from "@/lib/api-error";

export const runtime = "nodejs";

const MAX_KEYS_PER_USER = 10;

// Returns the key owner's keys. `key` is included so the dashboard can show
// the full value again on demand; the owner is already authenticated via
// their session, same as any other private resource on their account.
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ message: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }

  await connectDB();
  const keys = await ApiKey.find({ user: userId }).select("+key").sort({ createdAt: -1 });
  return NextResponse.json(
    keys.map((key) => ({
      _id: key._id,
      name: key.name,
      prefix: key.prefix,
      key: key.key,
      lastUsedAt: key.lastUsedAt ?? null,
      createdAt: key.createdAt,
    })),
  );
}

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ message: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }

  try {
    const { name } = (await request.json()) as { name?: string };
    if (!name?.trim()) {
      return NextResponse.json({ message: "Kalit nomini kiriting" }, { status: 400 });
    }

    await connectDB();
    if ((await ApiKey.countDocuments({ user: userId })) >= MAX_KEYS_PER_USER) {
      return NextResponse.json(
        { message: `Eng ko'pi bilan ${MAX_KEYS_PER_USER} ta kalit yaratish mumkin` },
        { status: 400 },
      );
    }

    const { key, prefix, keyHash } = generateApiKey();
    const apiKey = await ApiKey.create({ user: userId, name: name.trim(), prefix, key, keyHash });

    return NextResponse.json(
      { _id: apiKey._id, name: apiKey.name, prefix, createdAt: apiKey.createdAt, key },
      { status: 201 },
    );
  } catch (err) {
    const { message, status } = toErrorResponseBody(err);
    return NextResponse.json({ message }, { status });
  }
}
