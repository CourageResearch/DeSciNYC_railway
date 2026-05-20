import { NextRequest, NextResponse } from "next/server";
import { createEvent, getAllEvents } from "@/lib/events";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(await getAllEvents());
  } catch (error) {
    console.error("Failed to list admin events:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const title = String(body.title || "").trim();
    const lumaUrl = String(body.luma_url || "").trim();
    const lumaId = String(body.luma_id || "").trim();

    if (!title || !lumaUrl || !lumaId) {
      return NextResponse.json(
        { error: "Title, Luma URL, and Luma ID are required" },
        { status: 400 }
      );
    }

    const event = await createEvent({
      title,
      speaker: String(body.speaker || "").trim() || null,
      yt_uuid: String(body.yt_uuid || "").trim() || null,
      luma_url: lumaUrl,
      luma_id: lumaId,
      slides: String(body.slides || "").trim() || null,
      active: Boolean(body.active),
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("Failed to create admin event:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create event" },
      { status: 500 }
    );
  }
}
